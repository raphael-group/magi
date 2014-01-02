function toggleGroup(el, group){
	$('ul#group-' + group).slideToggle();
	var caret = $(el).children("span");
	if (caret.hasClass("glyphicon-chevron-down")){
		var oldClass = "glyphicon-chevron-down"
		, newClass   = "glyphicon-chevron-up";
	}
	else{
		var oldClass = "glyphicon-chevron-up"
		, newClass   = "glyphicon-chevron-down";
	}
	caret.removeClass(oldClass);
	caret.addClass(newClass);
}
function toggleCheckboxes(group, checked){
	var checkboxes = $("input.group-" + group + "-checkbox");
	checkboxes.prop("checked", checked);
}
