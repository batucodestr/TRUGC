class HideServerHeaderMiddleware:
    """Sunucu implementasyon detaylarını sızdıran header'ları kaldırır/normalize eder."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response.headers["Server"] = "TRUGC"
        if "X-Powered-By" in response.headers:
            del response.headers["X-Powered-By"]
        return response
