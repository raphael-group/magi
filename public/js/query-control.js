// Form control for when the user is formatting his/her query
$(document).ready(function() {
    // Globals for this UI
    var formEl = "#query-form",
        geneListEl = "#genes-list",
        geneUpoadEl = "#geneSet";

    var infoClasses  = 'alert alert-info',
        warningClasses = 'alert alert-warning',
        successClasses = 'alert alert-success';

    // Perform validation on the form when it is submitted
    $(formEl).on("submit", function(e){
        // Extract input data
        var geneList  = $(geneListEl).val(),
            numDatasets = $('.multiselect :checked').length;

        // Make sure at least one gene is entered
        // if (geneList == ""){
        //     status('Please enter at least one gene.', warningClasses);
        //     return false;
        // }

        // Make sure no more than 25 genes are entered
        var genes = geneList.split("\n").filter(function(g){ return g != ""; });
        if (genes.length > 25){
            status('Please enter <b>at most 25 genes</b> (one per line).', warningClasses);
            return false;
        }

        // Make sure there are no duplicated genes
        var seen = {},
            duplicates = false;

        genes.forEach(function(g){
            if (seen[g]) duplicates = true;
            seen[g] = true;
        });

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

    $(geneListEl).on("change", function(){ $(geneListEl).val($(geneListEl).val().toUpperCase()); });

    function status(msg, className){
        $(formEl + " div#status").attr("class", className);
        $(formEl + " div#status").html( msg );
    }
});
