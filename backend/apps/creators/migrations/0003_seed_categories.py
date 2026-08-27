from django.db import migrations
from django.utils.text import slugify

# Matches frontend/types/index.ts's `CreatorCategory` union exactly so
# registration (lib/auth.ts:resolveCategoryId) and directory filters have a
# stable id to resolve a display label against.
CATEGORY_NAMES = [
    "Fashion",
    "Beauty",
    "Fitness",
    "Food",
    "Travel",
    "Gaming",
    "Tech",
    "Lifestyle",
    "Music",
    "Comedy",
    "Business",
    "Parenting",
]


def seed_categories(apps, schema_editor):
    Category = apps.get_model("creators", "Category")
    for name in CATEGORY_NAMES:
        Category.objects.get_or_create(name=name, defaults={"slug": slugify(name)})


def unseed_categories(apps, schema_editor):
    Category = apps.get_model("creators", "Category")
    Category.objects.filter(name__in=CATEGORY_NAMES).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("creators", "0002_creator_cover_portfolioitem_kind_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_categories, unseed_categories),
    ]
