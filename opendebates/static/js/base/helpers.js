(function() {
  var ODebates = window.ODebates || {};

  ODebates.helpers = ODebates.helpers || {};

  ODebates.helpers.getParameterByName = function(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, " "));
  };

  ODebates.helpers.strTrim = function (str) {
    if (typeof str === "string") {
      return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    }
  };

  ODebates.helpers.isValidDate = function (d) {
    if ( Object.prototype.toString.call(d) !== "[object Date]" ){
      return false;
    }
    return !isNaN(d.getTime());
  };

  ODebates.helpers.isNumber = function (n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  };

  ODebates.helpers.capitalizeFirst = function (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  ODebates.helpers.calcPercent = function(count, total) {
    return (ODebates.helpers.isNumber(count) &&
           ODebates.helpers.isNumber(total) &&
           count > 0 &&
           total > 0) ?
           (count / total) * 100 : undefined;
  };

  ODebates.helpers.sign = function (x) {
    return typeof x === 'number' ? x ? x < 0 ? -1 : 1 : x === x ? 0 : NaN : NaN;
  };

  ODebates.helpers.validateEmail = function(email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  };
  ODebates.helpers.htmlDecode = function(encoded) {
    return $('<div/>').html(encoded).text();
  };

  ODebates.helpers.setTrackingDimension = function(key, value) {
    ODebates.trackingDimensions = ODebates.trackingDimensions || {};
    ODebates.trackingDimensions[key] = value;
  };

  ODebates.helpers.track = function(action, dimensions) {
    if (typeof window.mixpanel === 'undefined') {
      return;
    }
    if (typeof dimensions === 'undefined') {
      dimensions = {};
    }
    var merged = $.extend({}, dimensions, ODebates.trackingDimensions || {});
    window.mixpanel.track(action, merged);
  };

  ODebates.helpers.castVote = function(voterData, voteUrl, callback) {
    var data = JSON.parse(JSON.stringify(voterData));
    data.csrfmiddlewaretoken = $("[name=csrfmiddlewaretoken]").val();
    $.post(voteUrl, data, function(resp) {
      if (resp.status === "200") {
        var idea = $(".big-idea[data-idea-id="+resp.id+"]");
        idea.addClass('already-voted');
        if (resp.tally !== '') {
          idea.find(".vote-tally-number").html(resp.tally);
        }
        idea.find(".vote-button").hide();
        idea.find(".already-voted-button").css("display", "block");

      } else {
        $.each(resp.errors, function(key, vals) {
          if (key === 'captcha') {
            $('#captcha-help-block').html(vals.join(' '));
          } else {
            $('#modal-vote').find(':input[name='+key+']')
              .closest('.controls')
              .find('.help-block')
              .html(vals.join(' '));
          }
        });
        /* Reset captcha if the form had errors, because we can only
           validate a captcha token once, so we'll need a new one for
           the next time they submit. */
        window.grecaptcha.reset();
      }
      if (typeof callback === 'function') {
        callback(resp);
      }
    });
  };

  ODebates.helpers.attachEvents = function() {
    $("#modal-report form").off("submit");
    $("#modal-report form").on("submit", function(e) {
      if ($(this).find("[name=report_why]:checked").length === 0) {
        $("#modal-report").find(".modal-report-cue").css("color", "red");
        $("#modal-report").find(".checkbox").css("color", "red");
        e.preventDefault();
        return;
      }
    });
  };

  $(".social-links a").on("click", function() {
    var dimensions = {};
    dimensions.platform = $(this).attr("class");
    dimensions.submission = $(this).closest("[data-idea-id]").data("idea-id");
    if ($(this).closest("[data-idea-id]").hasClass("social-side-bar")) {
      dimensions.placement = "sidebar";
    } else {
      dimensions.placement = "main";
    }
    ODebates.helpers.track("share", dimensions);
  });

  $("#sidebar_question_btn").on("click", function() {
    $(this).hide();
    $('#add_question').slideDown();
    return false;
  });

  $(".show-duplicates a").on("click", function() {
    $(".duplicates-list").removeClass("hidden");
    $(".show-duplicates").hide();
    return false;
  });

  $(".search-only form .input-group-addon").on("click", function () {
    $(this).closest("form").submit();
  });

  if (ODebates.voter && ! ODebates.vote_needs_captcha) {
    /* If the modal is activated but we already know the voter and
       don't need a captcha, don't activate the modal; just submit a vote. */
    $(".modal-vote").on("show.bs.modal", function (e) {
      e.preventDefault();
      ODebates.helpers.castVote({"email": ODebates.voter.email, "zipcode": ODebates.voter.zip},
          $(e.relatedTarget).data("vote-url"));
    });
  }
  if (ODebates.voter) {
    $(window).load(function() {
      try {
        ODebates.votesCast = JSON.parse($("#my-votes-cast").text());
      } catch(e) {
        ODebates.votesCast = {};
      }
      $.each(ODebates.votesCast.submissions || [], function(i, objId) {
        var idea = $(".big-idea[data-idea-id="+objId+"]");
        if (!idea) { return; }
        idea.addClass('already-voted');
      });
    });
  }

  $(".report-button a").on("click", function(e) {
    e.preventDefault();

    if (!ODebates.voter || !ODebates.voter.has_account) {
      if ($("#modal-login-needed").length > 0) {
        $("#modal-login-needed").remove();
      }
      $(window.Handlebars.templates.login_needed_modal({
        "static": ODebates.paths.static,
        "login": ODebates.paths.login,
        "register": ODebates.paths.register,
        "msg": "You must first log in or create an account to report a question. After you've done so, simply find the question you were looking at and try again!"
      })).appendTo("body").modal("show");
      return false;
    }

    var ideaId = $(this).closest("[data-idea-id]").data("idea-id"),
        csrf = $("input[name=csrfmiddlewaretoken]").val();

    if ($("#modal-report").length > 0) {
      $("#modal-report").remove();
    }
    $(window.Handlebars.templates.report_modal({
      "static": ODebates.paths.static,
      "action": ODebates.paths.report.replace('/0/', '/'+ideaId+'/'),
      "csrf": csrf,
      "checkboxOptions": [
        {"label": "This question is spam or a scam"},
        {"label": "This question contains explicit content or hate speech"},
        {"label": "This is not a question"},
        {"label": "This question violates the Participation Guidelines"}
      ]
    })).appendTo("body").modal("show");
    ODebates.helpers.attachEvents();
  });

  $(".merge-button a").on("click", function(e) {
    e.preventDefault();

    if (!ODebates.voter || !ODebates.voter.has_account) {
      if ($("#modal-login-needed").length > 0) {
        $("#modal-login-needed").remove();
      }
      $(window.Handlebars.templates.login_needed_modal({
        "static": ODebates.paths.static,
        "login": ODebates.paths.login,
        "register": ODebates.paths.register,
        "msg": "You must first log in or create an account to suggest a merge. After you've done so, simply find the question you were looking at and try again!"
      })).appendTo("body").modal("show");
      return false;
    }

    var ideaId = $(this).closest("[data-idea-id]").data("idea-id"),
        csrf = $("input[name=csrfmiddlewaretoken]").val();

    if ($("#modal-merge").length > 0) {
      $("#modal-merge").remove();
    }
    $(window.Handlebars.templates.merge_modal({
      "static": ODebates.paths.static,
      "action": ODebates.paths.merge.replace('/0/', '/'+ideaId+'/'),
      "csrf": csrf
    })).appendTo("body").modal("show");
    ODebates.helpers.attachEvents();
  });

  $(".vote-button").on("click", function () {
    /* vote-button is the 'VOTE!' button under the vote count displayed on each idea */
    $($(this).data("target")).find("[data-vote-url]").attr("data-vote-url", $(this).data("vote-url"));
  });

  $(".votebutton").on("click", function () {
    /* .votebutton is the "submit" button in the modal vote dialog */
    var that = this,
        $form = $(this).closest('form');
    $form.find(".vote-error").addClass("hidden");
    var data = {
      "email": $form.find(":input[name=email]").val(),
      "zipcode": $form.find(":input[name=zipcode]").val()
    };
    if (ODebates.vote_needs_captcha) {
      data["g-recaptcha-response"] = $form.find(":input[name=g-recaptcha-response]").val();
    }
    ODebates.helpers.castVote(data, $(this).data("vote-url"), function(resp) {
      if (resp.status === "200") {
        $(that).closest(".modal").modal("hide");
        if (!ODebates.voter) {
          window.location.reload();
        }
      }
    });
    return false;
  });

  // adapted from http://codepen.io/lucien144/blog/highlight-asterix-in-placeholder-w-different-color
  if (RegExp(' AppleWebKit/').test(navigator.userAgent)) {
    $('input.required').each(function() {
      if (RegExp(/^\*/).test($(this).attr('placeholder'))) {
        return $(this).attr('placeholder', $(this).attr('placeholder').replace('*', ''));
      }
    });
  }

  $(window).load(function() {

    if (ODebates.voter) {
      if (ODebates.voter.has_account) {
        ODebates.helpers.setTrackingDimension("registration", "full");
      } else {
        ODebates.helpers.setTrackingDimension("registration", "voter");
      }
    } else {
      ODebates.helpers.setTrackingDimension("registration", "none");
    }

    try {
      if (window.location.hash && $(window.location.hash).hasClass("big-idea")) {
        $(".show-duplicates a").trigger("click");
        $('html, body').animate({
          scrollTop: $(window.location.hash).offset().top
        }, 500);
      }
    } catch (e) {}

    if (window.location.hash && window.location.hash.match(/created=(\d+)/)) {
      var ideaId = window.location.hash.match(/created=(\d+)/)[1];
      var el = $(window.Handlebars.templates.after_question_submitted_modal({
        "static": ODebates.paths.static,
        "strings": ODebates.strings
      }));
      el.find(".social-links-container .social-links").html(
        $(".big-idea[data-idea-id="+ideaId+"] .social-links").html());
      el.appendTo("body").modal("show");
    }

    // Break vote count into spans for styling
    $(".header-votes .number").each(function(){
      var $el = $(this);
      var text = $el.text();
      $el.html("");
      for (var i=0; i<text.length; i++) {
        $el.append("<span><span>"+text[i]+"</span></span>");
      }
    });

    var src = ODebates.helpers.getParameterByName("source");
    if (typeof src === "string") {
      $.cookie("opendebates.source", src, { path: "/" });
      ODebates.helpers.setTrackingDimension("sourcecode", src);
    }

    if (typeof ODebates.stashedSubmission !== 'undefined') {
      var form = $("#add_question form");
      var sub = ODebates.stashedSubmission;
      var htmlDecode = ODebates.helpers.htmlDecode;

      form.find(":input[name=category]").val(htmlDecode(sub.category));
      form.find(":input[name=headline]").val(htmlDecode(sub.headline));
      form.find(":input[name=question]").val(htmlDecode(sub.question));
      form.find(":input[name=citation]").val(htmlDecode(sub.citation) || '');
      form.submit();
    }

    if ($("#recent-activity").length === 1) {
      var fetch = function(delay) {
        $.get(ODebates.paths.recent)
            .done(function (data) {
              /* If successful, update page */
              $("#recent-activity").html(data);
            })
            .always(function () {
              /* Wait a little longer each time */
              delay = delay + 2000;
              setTimeout(fetch, delay, delay);
            });
      };
      /* Run first time immediately, to fill in that part of the page */
      setTimeout(fetch, 0, 0);
    }
  });

  function setCountDown() {
    var now = new Date();
    var target = ODebates.debate_time_utc;
    var d = target - now;
    if (d < 0) {
      $('.header-count-down .number').text('0');
    } else {
      var days = parseInt(d / (1000 * 60 * 60 * 24));
      var hours = parseInt((d - (days*24*60*60*1000)) / (1000 * 60 * 60));
      var minutes = parseInt((d - (days*24*60*60*1000) - (hours*60*60*1000)) / (1000 * 60));

      $('.header-count-down .days').text(days);
      $('.header-count-down .hours').text(hours);
      $('.header-count-down .minutes').text(minutes);
    }
  }
  setInterval(setCountDown, 60000);
  setCountDown();

  $('.selectpicker').selectpicker();

  function updateTextLimitCounts() {
    var $textarea = $(this);
    var $ctn = $textarea.closest('.control-group');
    var $remaining = $ctn.find('.count');
    var $counter = $ctn.find('.text-limit-counter');
    var total = $counter.data('total');
    var remaining = total - $textarea.val().length;
    $remaining.text(remaining);
    if (remaining < 0) {
      $counter.addClass('count-negative');
    } else {
      $counter.removeClass('count-negative');
    }
  }
  $('#add_question').on('keyup', 'textarea', updateTextLimitCounts);
  $('#add_question textarea').each(updateTextLimitCounts);

  $('#search-full').one('keyup click', function() {
    $('#search-small').remove();
  });
  $('#search-small').one('keyup click', function() {
    $('#search-full').remove();
  });

})();
