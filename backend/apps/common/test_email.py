"""Resend e-posta backend'inin testleri (HTTP katmanı taklit edilir, ağ kullanılmaz)."""

import base64
import json
import urllib.error
from unittest.mock import patch

from django.core.mail import EmailMessage, EmailMultiAlternatives, send_mail
from django.test import SimpleTestCase, override_settings

from apps.common.email import ResendEmailBackend, ResendError, select_email_backend

BACKEND_PATH = "apps.common.email.ResendEmailBackend"


class FakeResponse:
    """``urlopen`` context manager'ının döndürdüğü nesnenin asgari taklidi."""

    def __init__(self, body=b'{"id": "re_fake_id"}'):
        self._body = body

    def read(self):
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *exc_info):
        return False


def http_error(code, body=b'{"message": "hata"}'):
    return urllib.error.HTTPError("https://api.resend.com/emails", code, "err", {}, None)


@override_settings(
    EMAIL_BACKEND=BACKEND_PATH,
    RESEND_API_KEY="re_test_key",
    RESEND_API_URL="https://api.resend.com/emails",
    RESEND_MAX_RETRIES=0,
    DEFAULT_FROM_EMAIL="noreply@trugc.com.tr",
)
class ResendPayloadTests(SimpleTestCase):
    """``send_mail`` çağrıları Resend'in beklediği gövdeye dönüşüyor mu?"""

    def _send_and_capture(self, send):
        with patch("apps.common.email.urllib.request.urlopen", return_value=FakeResponse()) as urlopen:
            result = send()
        self.assertEqual(urlopen.call_count, 1)
        request = urlopen.call_args.args[0]
        return result, request, json.loads(request.data.decode())

    def test_send_mail_posts_to_resend_with_bearer_auth(self):
        result, request, payload = self._send_and_capture(
            lambda: send_mail(
                subject="Konu",
                message="Düz metin",
                from_email="noreply@trugc.com.tr",
                recipient_list=["kullanici@ornek.com"],
                fail_silently=False,
            )
        )

        self.assertEqual(result, 1)
        self.assertEqual(request.full_url, "https://api.resend.com/emails")
        self.assertEqual(request.get_method(), "POST")
        self.assertEqual(request.get_header("Authorization"), "Bearer re_test_key")
        self.assertEqual(request.get_header("Content-type"), "application/json")
        self.assertEqual(payload["from"], "noreply@trugc.com.tr")
        self.assertEqual(payload["to"], ["kullanici@ornek.com"])
        self.assertEqual(payload["subject"], "Konu")
        self.assertEqual(payload["text"], "Düz metin")
        self.assertNotIn("html", payload)

    def test_request_sends_a_non_urllib_user_agent(self):
        """Cloudflare, stdlib'in "Python-urllib/3.x" imzasını Error 1010 ile 403'ler.

        Bu başlık düşerse gönderim canlıda tamamen durur, bu yüzden test edilir.
        """
        _, request, _ = self._send_and_capture(
            lambda: send_mail(
                subject="Konu",
                message="metin",
                from_email="noreply@trugc.com.tr",
                recipient_list=["kullanici@ornek.com"],
                fail_silently=False,
            )
        )
        user_agent = request.get_header("User-agent")
        self.assertTrue(user_agent)
        self.assertNotIn("urllib", user_agent.lower())
        self.assertNotIn("python", user_agent.lower())

    def test_user_agent_can_be_overridden_by_setting(self):
        backend = ResendEmailBackend(fail_silently=False, user_agent="ozel-ajan/9")
        with patch("apps.common.email.urllib.request.urlopen", return_value=FakeResponse()) as urlopen:
            backend.send_messages(
                [EmailMessage(subject="k", body="m", from_email="a@trugc.com.tr", to=["b@ornek.com"])]
            )
        self.assertEqual(urlopen.call_args.args[0].get_header("User-agent"), "ozel-ajan/9")

    def test_html_message_becomes_html_field(self):
        _, _, payload = self._send_and_capture(
            lambda: send_mail(
                subject="Doğrulama",
                message="metin hali",
                html_message="<p>html hali</p>",
                from_email="noreply@trugc.com.tr",
                recipient_list=["kullanici@ornek.com"],
                fail_silently=False,
            )
        )
        self.assertEqual(payload["text"], "metin hali")
        self.assertEqual(payload["html"], "<p>html hali</p>")

    def test_html_only_message_still_sends(self):
        def send():
            message = EmailMessage(
                subject="Sadece html", body="<p>x</p>", from_email="a@trugc.com.tr", to=["b@ornek.com"]
            )
            message.content_subtype = "html"
            return message.send()

        _, _, payload = self._send_and_capture(send)
        self.assertEqual(payload["html"], "<p>x</p>")
        self.assertNotIn("text", payload)

    def test_cc_bcc_reply_to_and_headers_are_mapped(self):
        def send():
            message = EmailMultiAlternatives(
                subject="Konu",
                body="metin",
                from_email="noreply@trugc.com.tr",
                to=["a@ornek.com"],
                cc=["c@ornek.com"],
                bcc=["g@ornek.com"],
                reply_to=["destek@trugc.com.tr"],
                headers={"X-Entity-Ref-ID": "42", "Subject": "ezilmemeli"},
            )
            return message.send()

        _, _, payload = self._send_and_capture(send)
        self.assertEqual(payload["cc"], ["c@ornek.com"])
        self.assertEqual(payload["bcc"], ["g@ornek.com"])
        self.assertEqual(payload["reply_to"], ["destek@trugc.com.tr"])
        self.assertEqual(payload["headers"], {"X-Entity-Ref-ID": "42"})

    def test_attachment_is_base64_encoded(self):
        def send():
            message = EmailMessage(
                subject="Ek", body="metin", from_email="a@trugc.com.tr", to=["b@ornek.com"]
            )
            message.attach("rapor.txt", "içerik", "text/plain")
            return message.send()

        _, _, payload = self._send_and_capture(send)
        self.assertEqual(payload["attachments"][0]["filename"], "rapor.txt")
        self.assertEqual(
            base64.b64decode(payload["attachments"][0]["content"]).decode(),
            "içerik",
        )

    def test_message_without_recipients_is_not_sent(self):
        with patch("apps.common.email.urllib.request.urlopen") as urlopen:
            sent = EmailMessage(subject="k", body="m", from_email="a@trugc.com.tr", to=[]).send()
        self.assertEqual(sent, 0)
        urlopen.assert_not_called()


@override_settings(
    EMAIL_BACKEND=BACKEND_PATH,
    RESEND_API_KEY="re_test_key",
    RESEND_MAX_RETRIES=0,
    DEFAULT_FROM_EMAIL="noreply@trugc.com.tr",
)
class ResendFailureTests(SimpleTestCase):
    """Hata yolları: fail_silently sözleşmesi ve tekrar deneme."""

    def _message(self, **kwargs):
        return EmailMessage(subject="Konu", body="metin", from_email="a@trugc.com.tr", to=["b@ornek.com"], **kwargs)

    def test_http_error_raises_when_not_fail_silently(self):
        backend = ResendEmailBackend(fail_silently=False)
        with patch("apps.common.email.urllib.request.urlopen", side_effect=http_error(403)):
            with self.assertRaises(ResendError):
                backend.send_messages([self._message()])

    def test_http_error_is_swallowed_when_fail_silently(self):
        backend = ResendEmailBackend(fail_silently=True)
        with patch("apps.common.email.urllib.request.urlopen", side_effect=http_error(403)):
            self.assertEqual(backend.send_messages([self._message()]), 0)

    def test_registration_style_send_does_not_raise_without_api_key(self):
        """``fail_silently=True`` çağrıları (kayıt/şifre sıfırlama) anahtar yokken de 500 atmamalı."""
        with override_settings(RESEND_API_KEY=""):
            with patch("apps.common.email.urllib.request.urlopen") as urlopen:
                sent = send_mail(
                    subject="k",
                    message="m",
                    from_email="a@trugc.com.tr",
                    recipient_list=["b@ornek.com"],
                    fail_silently=True,
                )
        self.assertEqual(sent, 0)
        urlopen.assert_not_called()

    def test_missing_api_key_raises_when_not_fail_silently(self):
        backend = ResendEmailBackend(fail_silently=False, api_key="")
        with self.assertRaises(ResendError):
            backend.send_messages([self._message()])

    def test_rate_limit_is_retried_then_succeeds(self):
        backend = ResendEmailBackend(fail_silently=False, max_retries=1)
        with patch("apps.common.email.time.sleep"):
            with patch(
                "apps.common.email.urllib.request.urlopen",
                side_effect=[http_error(429), FakeResponse()],
            ) as urlopen:
                self.assertEqual(backend.send_messages([self._message()]), 1)
        self.assertEqual(urlopen.call_count, 2)

    def test_client_error_is_not_retried(self):
        backend = ResendEmailBackend(fail_silently=True, max_retries=3)
        with patch("apps.common.email.urllib.request.urlopen", side_effect=http_error(422)) as urlopen:
            self.assertEqual(backend.send_messages([self._message()]), 0)
        self.assertEqual(urlopen.call_count, 1)

    def test_network_error_is_retried_up_to_limit(self):
        backend = ResendEmailBackend(fail_silently=True, max_retries=2)
        with patch("apps.common.email.time.sleep"):
            with patch(
                "apps.common.email.urllib.request.urlopen",
                side_effect=urllib.error.URLError("ağ yok"),
            ) as urlopen:
                self.assertEqual(backend.send_messages([self._message()]), 0)
        self.assertEqual(urlopen.call_count, 3)

    def test_one_bad_message_does_not_block_the_others(self):
        backend = ResendEmailBackend(fail_silently=True)
        with patch(
            "apps.common.email.urllib.request.urlopen",
            side_effect=[http_error(422), FakeResponse()],
        ):
            self.assertEqual(backend.send_messages([self._message(), self._message()]), 1)


class EmailBackendSelectionTests(SimpleTestCase):
    """``base.py``nin kullandığı seçim sırası: açık değer > Resend > SMTP > console."""

    def test_resend_key_wins_over_smtp(self):
        self.assertEqual(
            select_email_backend(explicit="", resend_api_key="re_x", email_host="smtp.gmail.com"),
            "apps.common.email.ResendEmailBackend",
        )

    def test_smtp_used_when_no_resend_key(self):
        self.assertEqual(
            select_email_backend(explicit="", resend_api_key="", email_host="smtp.gmail.com"),
            "django.core.mail.backends.smtp.EmailBackend",
        )

    def test_console_when_nothing_configured(self):
        self.assertEqual(
            select_email_backend(),
            "django.core.mail.backends.console.EmailBackend",
        )

    def test_blank_values_are_treated_as_unset(self):
        self.assertEqual(
            select_email_backend(explicit="   ", resend_api_key="  ", email_host=" "),
            "django.core.mail.backends.console.EmailBackend",
        )

    def test_explicit_backend_overrides_everything(self):
        self.assertEqual(
            select_email_backend(
                explicit="django.core.mail.backends.locmem.EmailBackend",
                resend_api_key="re_x",
                email_host="smtp.gmail.com",
            ),
            "django.core.mail.backends.locmem.EmailBackend",
        )
