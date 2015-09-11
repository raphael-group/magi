$().ready(function() {
  $('#consentLog').attr('disabled', true);
  $.post('/userGaveConsent')
    .done(function(res) {
      $('#consentLog').attr('disabled', false);
      $('#consentLog').attr('checked', res == 'true' ? true : false);
    });

    var successClasses  = 'alert alert-success',
    warningClasses = 'alert alert-warning';

    function deleteAnnotation() {
	if ($(this).attr("class") === "trash-mut-icon")  {
	    rootRoute = "/annotation/mutation/"
	} else if ($(this).attr("class") === "trash-ppi-icon") {
	    rootRoute = "/annotation/interaction/"
	}
	uid = $(this).data("uid")
	parentRow = $(this).parents(".anno-tr")
	$.ajax({
	    url: rootRoute + uid,
	    type: 'DELETE',
	    error: function(xhr) {
		statusOnDelete($(parentRow), 'Database error: ' + xhr.status, warningClasses);
	    },

	    success: function(response) {
		if(response.error) {
		    statusOnDelete($(parentRow), 'Oops, something bad happened: ' + xhr.status, warningClasses)
		    return;
		}
		statusOnDelete($(parentRow), response.status, successClasses);	
	    }
	}) 
    }

    function statusOnDelete(elem, result, classes) {
	$(elem).html(result);
	$(elem).attr('class', classes);
    }

    $(".trash-ppi-icon").click(deleteAnnotation);
    $(".trash-mut-icon").click(deleteAnnotation);
});


$('#consentLog').on('change', function() {
  var checked = this.checked;
  $.post('/logConsent', {enable:this.checked});
});

$('#consentMoreInfo').click(function() {
  var textHidden = $('#consentMoreInfoDiv').css('display') == 'none' ? true : false;
  if(textHidden == true) {
    $('#consentMoreInfoDiv').show(500);
    $(this).text('(Less Information)');
  } else {
    $('#consentMoreInfoDiv').hide(500);
    $(this).text('(More Information)');
  }
});