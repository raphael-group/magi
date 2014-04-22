// Form control for when the user is formatting his/her query
$(document).ready(function() {
    // Globals for this UI
    var formEl = "#query-form"
    , geneListEl = "#genes-list"
    , geneUpoadEl = "#geneSet";

    var infoClasses  = 'alert alert-info'
    , warningClasses = 'alert alert-warning'
    , successClasses = 'alert alert-success';

    // Perform validation on the form when it is submitted
    $(formEl).on("submit", function(e){
        // Extract input data
        var geneList  = $(geneListEl).val()
        , numDatasets = $(formEl + ' input.group-checkbox[type=checkbox]:checked').length;

        // Make sure at least one gene is entered
        if (geneList == ""){
            status('Please enter at least one gene.', warningClasses);
            return false;
        }

        // Make sure no more than 25 genes are entered
        var genes = geneList.split("\n").filter(function(g){ return g != ""; });
        console.log(genes)
        if (genes.length > 25){
            status('Please enter <b>at most 25 genes</b> (one per line).', warningClasses);
            return false;
        }

        // Make sure there are no duplicated genes
        var seen = [],
            duplicates = false;
        for (var i in genes){
            if (seen.indexOf(genes[i]) != -1){
                console.log(seen)
                duplicates = true;
                break
            }
            seen.push( genes[i] );
        }

        if (duplicates){
            status('Please do not enter duplicate genes.', warningClasses);
            return false;
        }

        // Make sure at least one dataset is checked
        if (numDatasets == 0){
            status('Please check at least one dataset.', warningClasses);
            return false;
        }

        // If everything checks out, submit the form!
        return true;
    });

    $('.group-selectAll').change(function() {
        var groupNum = (this.id).replace('selectAll-',''),
            checkboxClass = '.group-'+groupNum+'-checkbox';
        console.log(this);
        console.log(groupNum)
        console.log(checkboxClass);
        $(checkboxClass).each(function(i) {
            if(this.class == '.group-selectAll') {
                return;
            }
            console.log('each');
            this.checked = this.checked == true ? false : true;
        });
    });
});

// Toggle the checkboxes for a given group of datasets
function toggleGroup(el, group){
    // Toggle a slide to show/hide each dataset in the group
    $('ul#group-' + group).slideToggle();

    // Change the direction of the caret based on whether we
    // are showing/hiding the group of datasets
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

// (Un)Check all the checkboxes in the given group, depending on the value
// of checked
function toggleCheckboxes(group, checked){
    var checkboxes = $("input.group-" + group + "-checkbox");
    checkboxes.prop("checked", checked);
}
