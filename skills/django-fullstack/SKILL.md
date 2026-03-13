---
name: django-fullstack
description: Django full-stack development patterns — models, views, DRF serializers, URL routing, testing, and deployment. Use when building or modifying Django applications.
---

# Django Full-Stack Development

## When to Use

- Building Django models, views, and templates
- Creating REST APIs with Django REST Framework
- Writing Django tests
- Configuring Django settings and URL routing
- Managing database migrations

## Project Structure

```
project/
├── config/              # Project settings
│   ├── settings/
│   │   ├── base.py      # Shared settings
│   │   ├── local.py     # Development
│   │   └── production.py
│   ├── urls.py
│   └── wsgi.py
├── apps/
│   └── <app_name>/
│       ├── models.py
│       ├── views.py
│       ├── serializers.py
│       ├── urls.py
│       ├── admin.py
│       ├── tests/
│       │   ├── test_models.py
│       │   ├── test_views.py
│       │   └── test_serializers.py
│       └── migrations/
├── manage.py
└── requirements/
    ├── base.txt
    ├── local.txt
    └── production.txt
```

## Models

```python
from django.db import models
from django.utils import timezone

class TimeStampedModel(models.Model):
    """Abstract base for created/modified timestamps."""
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class Article(TimeStampedModel):
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=255)
    content = models.TextField()
    author = models.ForeignKey(
        "auth.User",
        on_delete=models.CASCADE,
        related_name="articles",
    )
    is_published = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["slug", "is_published"]),
        ]

    def __str__(self) -> str:
        return self.title
```

## Django REST Framework

### Serializers

```python
from rest_framework import serializers

class ArticleSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)

    class Meta:
        model = Article
        fields = ["id", "title", "slug", "content", "author", "author_name", "is_published", "created_at"]
        read_only_fields = ["id", "slug", "created_at"]

class ArticleCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = ["title", "content"]

    def create(self, validated_data):
        validated_data["author"] = self.context["request"].user
        validated_data["slug"] = slugify(validated_data["title"])
        return super().create(validated_data)
```

### ViewSets

```python
from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend

class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.select_related("author")
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_published", "author"]
    search_fields = ["title", "content"]
    ordering_fields = ["created_at", "title"]

    def get_serializer_class(self):
        if self.action == "create":
            return ArticleCreateSerializer
        return ArticleSerializer
```

### URL Configuration

```python
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register("articles", ArticleViewSet, basename="article")
urlpatterns = router.urls
```

## Testing

```python
import pytest
from django.urls import reverse
from rest_framework.test import APIClient

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def user(django_user_model):
    return django_user_model.objects.create_user(
        username="testuser", password="testpass123"
    )

@pytest.mark.django_db
class TestArticleAPI:
    def test_list_published_articles(self, api_client):
        url = reverse("article-list")
        response = api_client.get(url)
        assert response.status_code == 200

    def test_create_requires_auth(self, api_client):
        url = reverse("article-list")
        response = api_client.post(url, {"title": "Test", "content": "Body"})
        assert response.status_code == 401

    def test_create_article(self, api_client, user):
        api_client.force_authenticate(user=user)
        url = reverse("article-list")
        response = api_client.post(url, {"title": "Test Article", "content": "Body text"})
        assert response.status_code == 201
        assert response.data["title"] == "Test Article"
```

## Best Practices

- Use `select_related()` and `prefetch_related()` to avoid N+1 queries
- Always create migrations after model changes: `python manage.py makemigrations`
- Use Django's `F()` and `Q()` objects for complex queries
- Separate read and write serializers for clarity
- Use `pytest-django` over Django's built-in test runner
- Keep views thin — move business logic to services or model methods
- Use environment variables for secrets (never in settings files)
- Use `django-environ` for environment variable parsing
