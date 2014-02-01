// Form control for when the user is formatting his/her query
$(document).ready(function() {
    // Globals for this UI
    var formEl = "#data-upload-form"
        datasetNameEl = "#dataset",
        groupNameEl = "#groupName",
        snvFileEl = "#SNVs",
        sampleFileEl = "#testedSamples";

    var infoClasses  = 'alert alert-info'
    , warningClasses = 'alert alert-warning'
    , successClasses = 'alert alert-success';

    // Perform validation on the form when it is submitted
    $(formEl).submit(function(e){
        e.preventDefault();

        // Extract input data
        var dataset  = $(datasetNameEl).val(),
            snvFile = $(snvFileEl)[0].files[0]
            sampleFile = $(sampleFileEl)[0].files[0],
            groupName = $(groupNameEl).val();

        // Make sure the dataset is named
        var datasetValidates = false;
        if (dataset == ""){
            status('Please name your dataset.', warningClasses);
            return false;
        }
        else{ datasetValidates = true; }

        // Make sure there's an SNV file, and that it is not too large etc.
        var snvFileValidates = false;
        if (!snvFile){
            status('Please choose an SNV file.', warningClasses);
            return false;
        }
        else if (snvFile.size > 1000000){
            status('SNV file is too large. Please upload a smaller SNV file.', warningClasses);
            return false;
        }
        else if(snvFile.type != 'text/plain' && snvFile.type != 'text/tab-separated-values'){
            status('SNV file upload: only text and tsv files are allowed.', warningClasses);
            return false;
        }
        else{
            snvFileValidates = true;
        }

        // Make sure there's a sample file and it's not too large etc.
        var sampleFileValidates = false;
        if (!sampleFile){
            status('Please choose an sample file.', warningClasses);
            return false;
        }
        else if (sampleFile.size > 1000000){
            status('Sample file is too large. Please upload a smaller sample file.', warningClasses);
            return false;
        }
        else if(sampleFile.type != 'text/plain' && sampleFile.type != 'text/tab-separated-values'){
            status('Sample file upload: only text and tsv files are allowed.', warningClasses);
            return false;
        }
        else{
            sampleFileValidates = true;
        }

        // If everything checks out, submit the form
        if (datasetValidates && snvFileValidates && sampleFileValidates){
            status('Uploading...', infoClasses);

            // Create a mini-form
            var data = new FormData();
            data.append( 'SNVs', snvFile );
            data.append( 'testedSamples', sampleFile );
            data.append( 'dataset', dataset );
            data.append( 'groupName', groupName );

            // Submit an AJAX-ified form
            $.ajax({
                // Note: can't use JSON otherwise IE8 will pop open a dialog
                // window trying to download the JSON as a file
                url: '/upload/dataset',
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
                    console.log(response);
                    status(response.status, successClasses);
                }
            });
        }
        return false;
    });

    function status(msg, classes) {
        $("#status").attr('class', classes);
        $('#status').html(msg);
    }
});
