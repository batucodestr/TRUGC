from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Review(models.Model):
    """A rating left by one campaign party about the other, once collaboration concludes."""

    campaign = models.ForeignKey("campaigns.Campaign", on_delete=models.CASCADE, related_name="reviews")
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews_given")
    reviewee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews_received")
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "reviews_review"
        ordering = ["-created_at"]
        unique_together = ("campaign", "reviewer", "reviewee")
        indexes = [models.Index(fields=["reviewee"])]

    def __str__(self):
        return f"Review<{self.reviewer_id}->{self.reviewee_id}:{self.rating}>"
