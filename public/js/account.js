$().ready(function() {
  $.post('/userGaveConsent')
    .done(function(res) {
      console.log('user gave consent?', res);
    });
});

$('#consentLog').on('change', function() {
  var checked = this.checked;
  $.post('/logConsent', {enable:this.checked});
});