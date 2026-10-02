"""Merkezi ücretlendirme mantığının (hafta sonu ücretsiz / hafta içi ücretli) testleri."""

from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.test import SimpleTestCase, override_settings

from apps.common import pricing

ISTANBUL = ZoneInfo("Europe/Istanbul")

# 2026 takviminde bilinen günler (yerel saat):
MONDAY = datetime(2026, 10, 5, 10, 0, tzinfo=ISTANBUL)
FRIDAY = datetime(2026, 10, 2, 23, 30, tzinfo=ISTANBUL)
SATURDAY = datetime(2026, 10, 3, 2, 0, tzinfo=ISTANBUL)
SUNDAY = datetime(2026, 10, 4, 23, 59, tzinfo=ISTANBUL)


@override_settings(BILLING_FREE_PERIOD_ENABLED=True, BILLING_FREE_WEEKDAYS=[5, 6], BILLING_TIMEZONE="Europe/Istanbul")
class FreePeriodCalendarTests(SimpleTestCase):
    def test_saturday_and_sunday_are_free(self):
        self.assertTrue(pricing.is_free_period(SATURDAY))
        self.assertTrue(pricing.is_free_period(SUNDAY))

    def test_weekdays_are_paid(self):
        self.assertTrue(pricing.is_paid_period(MONDAY))
        self.assertTrue(pricing.is_paid_period(FRIDAY))
        self.assertFalse(pricing.is_free_period(MONDAY))

    def test_day_boundary_uses_billing_timezone_not_utc(self):
        """Cumartesi 02:00 (TR) UTC'de hâlâ Cuma 23:00'tür.

        Ücretlendirme takvim günü UTC'ye göre hesaplanırsa, Cumartesi'nin ilk
        üç saatinde kullanıcıdan ücret istenirdi. Bu test o regresyonu kilitler.
        """
        utc_equivalent = SATURDAY.astimezone(ZoneInfo("UTC"))
        self.assertEqual(utc_equivalent.weekday(), 4)  # UTC'de Cuma
        self.assertTrue(pricing.is_free_period(SATURDAY))

    def test_commission_is_zero_during_free_period(self):
        with override_settings(PLATFORM_COMMISSION_PERCENT="12"):
            self.assertEqual(pricing.commission_percent(SATURDAY), Decimal("0"))
            self.assertEqual(pricing.commission_percent(MONDAY), Decimal("12"))

    def test_payments_disabled_only_during_free_period(self):
        self.assertFalse(pricing.payments_enabled(SUNDAY))
        self.assertTrue(pricing.payments_enabled(MONDAY))

    def test_next_transition_points_at_midnight_of_the_change(self):
        # Cuma → ertesi gün (Cumartesi) ücretsize geçer.
        self.assertEqual(pricing.next_transition(FRIDAY).date(), SATURDAY.date())
        # Pazar → ertesi gün (Pazartesi) ücretlendirme geri döner.
        self.assertEqual(pricing.next_transition(SUNDAY).date(), MONDAY.date())
        self.assertEqual(pricing.next_transition(SUNDAY).hour, 0)

    def test_state_payload_is_self_describing(self):
        state = pricing.pricing_state(SATURDAY).as_dict()
        self.assertTrue(state["free"])
        self.assertFalse(state["paid"])
        self.assertFalse(state["payments_enabled"])
        self.assertEqual(state["weekday_label"], "Cumartesi")
        self.assertEqual(state["free_weekday_labels"], ["Cumartesi", "Pazar"])

    def test_brand_access_price_is_zero_during_free_period(self):
        with override_settings(BRAND_ACCESS_PRICE="499.00"):
            self.assertEqual(pricing.brand_access_price(SATURDAY), Decimal("0"))
            self.assertEqual(pricing.brand_access_price(MONDAY), Decimal("499.00"))


class FreePeriodConfigurationTests(SimpleTestCase):
    @override_settings(BILLING_FREE_PERIOD_ENABLED=False, BILLING_FREE_WEEKDAYS=[5, 6])
    def test_master_switch_disables_free_period(self):
        self.assertFalse(pricing.is_free_period(SATURDAY))
        self.assertTrue(pricing.payments_enabled(SATURDAY))

    @override_settings(BILLING_FREE_PERIOD_ENABLED=True, BILLING_FREE_WEEKDAYS="5,6")
    def test_free_weekdays_accepts_comma_string(self):
        self.assertEqual(pricing.free_weekdays(), (5, 6))
        self.assertTrue(pricing.is_free_period(SUNDAY))

    @override_settings(BILLING_FREE_PERIOD_ENABLED=True, BILLING_FREE_WEEKDAYS=[9, "x", 6])
    def test_invalid_weekday_values_are_ignored(self):
        self.assertEqual(pricing.free_weekdays(), (6,))
        self.assertFalse(pricing.is_free_period(SATURDAY))
        self.assertTrue(pricing.is_free_period(SUNDAY))

    @override_settings(BILLING_TIMEZONE="Not/AZone")
    def test_invalid_timezone_falls_back_safely(self):
        self.assertEqual(str(pricing.billing_timezone()), "Europe/Istanbul")
