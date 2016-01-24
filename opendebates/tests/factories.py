import string

from django.contrib.auth import get_user_model
from django.utils.timezone import now
import factory
import factory.fuzzy

from opendebates import models


class UserFactory(factory.DjangoModelFactory):
    class Meta:
        model = get_user_model()

    username = factory.Sequence(lambda n: "user%d" % n)
    email = factory.LazyAttribute(lambda o: '%s@example.org' % o.username)
    password = factory.PostGenerationMethodCall('set_password', 'password')

    is_staff = False
    is_active = True

    @factory.post_generation
    def groups(self, create, extracted, **kwargs):
        if not create:
            return
        if extracted:
            for group in extracted:
                self.groups.add(group)


class CategoryFactory(factory.DjangoModelFactory):
    class Meta:
        model = models.Category


class VoterFactory(factory.DjangoModelFactory):
    class Meta:
        model = models.Voter

    user = factory.SubFactory(UserFactory)
    zip = factory.fuzzy.FuzzyText(length=5, chars=string.digits)


class SubmissionFactory(factory.DjangoModelFactory):
    class Meta:
        model = models.Submission

    category = factory.SubFactory(CategoryFactory)
    idea = factory.fuzzy.FuzzyText()
    voter = factory.SubFactory(VoterFactory)
    created_at = now()
    approved = True
    votes = 1


class VoteFactory(factory.DjangoModelFactory):
    class Meta:
        model = models.Vote

    submission = factory.SubFactory(SubmissionFactory)
    voter = factory.SubFactory(VoterFactory)
    created_at = now()
