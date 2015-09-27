// set up the account page by adding delete links and looking for user consent

$().ready(function() {
  $('#consentLog').attr('disabled', true);
  $.post('/userGaveConsent')
    .done(function(res) {
      $('#consentLog').attr('disabled', false);
      $('#consentLog').attr('checked', res == 'true' ? true : false);
    });
    $(".trash-ppi-icon").click(deleteAnnotation);
});

function deleteAnnotation() {
    var successClasses  = 'alert alert-success',
    warningClasses = 'alert alert-warning';

    function statusOnDelete(elem, result, classes) {
	// console.log(elem);
	// console.log($(elem));
	// console.log(result);
	$(elem).html(result);
	$(elem).attr('class', classes);
    }

    var route, uid = $(this).data("uid");

    if ($(this).attr("class") === "trash-mut-icon")  {
	route = "/annotation/mutation/" + uid;
    } else if ($(this).attr("class") === "trash-ppi-icon") {
	route = "/annotation/interaction/" + uid;
    } else if ($(this).attr("class") === "trash-source-icon") {
	var aber_id = $(this).data('aber-id');
	route = "/annotation/mutation/" + aber_id + '/source/' + uid;
    }
    console.log("uid:", uid)
    parentRow = $(this).parents("tr");
    $.ajax({
	url: route,
	type: 'DELETE',
	error: function(xhr) {
	    statusOnDelete($(parentRow), 'Database error: ' + xhr.status, warningClasses);
	},

	success: function(response) {
	    if(response.error) {
		statusOnDelete($(parentRow), 'Oops, something bad happened: ' + response.error, warningClasses)
		return;
	    }
	    statusOnDelete($(parentRow), response.status, successClasses);
	}
    })
}


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