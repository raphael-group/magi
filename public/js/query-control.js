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

    // Function for AJAX-ified file upload
    // Check to see when a user has selected a file
    $(geneUpoadEl).on('change', function(){

        // Parse the first file given by the user
        var file = this.files[0]
        , name = file.name
        , size = file.size
        , type = file.type;

        // Make sure the file is of appropriate size and type
        if(file.name.length < 1) {
            status('Cannot upload empty file.', warningClasses);
        }
        else if(file.size > 100000) {
            status('File is too large. Please upload a smaller file.', warningClasses);
        }
        else if(file.type != 'text/plain'){
            status('File upload: only text files are allowed.', warningClasses);
        }
        // If everything checks out, submit a ajax POST request
        else { 
            status('Uploading...', infoClasses);

            // Create a mini-form
            var data = new FormData();
            data.append( 'geneSet', file );

            // Submit an AJAX-ified form
            $.ajax({
                // Note: can't use JSON otherwise IE8 will pop open a dialog
                // window trying to download the JSON as a file
                url: '/upload/geneset',
                data: data,
                cache: false,
                contentType: false,
                processData: false,
                type: 'POST',

                error: function(xhr) {
                    status('File upload error: ' + xhr.status);
                },
                
                success: function(response) {
                    if(response.error) {
                        status('File upload: Oops, something bad happened.', warningClasses);
                        return;
                    }

                    var genes = response.genes;
                    
                    status("Upload complete.", successClasses);
                    $(geneListEl).val(genes);
                }
            });
        }

    });

    function status(msg, classes) {
        $("#status").attr('class', classes);
        $('#status').html(msg);
    }
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
