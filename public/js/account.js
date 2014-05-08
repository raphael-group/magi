$().ready(function() {
  $('#consentLog').attr('disabled', true);
  $.post('/userGaveConsent')
    .done(function(res) {
      $('#consentLog').attr('disabled', false);
      $('#consentLog').attr('checked', res == 'true' ? true : false);
    });
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