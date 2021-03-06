from django.conf.urls import include, url
from django.contrib import admin
from django.views.generic.base import RedirectView


urlpatterns = [
    url(r'^$', RedirectView.as_view(url='https://opendebatecoalition.com', permanent=False)),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^healthcheck.html$', 'opendebates.views.health_check', name='health_check'),
    url(r'^(?P<prefix>[-\w]+)/', include('opendebates.prefixed_urls')),
]
