// Validates the form input when a user tries to add a cancer type

//- Set the color chooser to the given color
function setColor(color){
	$('#db-color').css('background', color)
	$("input#color").val(color);
}

//- Give the user a random color
function randomColor(){
	setColor('#' + Math.random().toString(16).substr(-6));
}

//- Update the color as the user changes the color input
$("input#color").on("change", function(){
	$("span#db-color").css('background', $("input#color").val());
});

//- Validation
$(document).ready(function() {
	// Globals for this UI
	var formEl = "form#add-cancer-type"
		nameEl = "#name",
		abbrEl = "#abbr",
		colorEl = "#color";

	var infoClasses  = 'alert alert-info',
		warningClasses = 'alert alert-warning',
		successClasses = 'alert alert-success';

	$("#submit").click(function(e) {
		e.preventDefault();
		var name  = $(nameEl).val(),
			color = $(colorEl).val(),
			abbr = $(abbrEl).val();

		// Validate data
		if (!name){
			status("You must give a name.", warningClasses);
			return false;
		}
		if (!abbr || abbr.length > 6 || abbr.length < 3){
			status("You must give an abbreviation of 3-6 characters.", warningClasses);
			return false;
		}
		if (!color || !isHexColor(color)){
			status("Please enter a hex color.", warningClasses);
			return false;
		}

		// Submit form
		status("Submitting.", successClasses);
		$(formEl).submit();

	});

	function status(msg, classes) {
		$("#status").attr('class', classes);
		$('#status').html(msg);
	}

	function isHexColor(c) {
		return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(c)
	}
});