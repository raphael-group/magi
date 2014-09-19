// Form control for when the user is formatting his/her query
$(document).ready(function() {
    // Globals for this UI
    var formEl = "#data-upload-form"
        datasetNameEl = "#dataset",
        groupNameEl = "#groupName",
        snvFileEl = "#SNVs",
        cnaFileEl = "#CNAs",
        aberrationFileEl = "#aberrations",
        sampleFileEl = "#testedSamples",
        colorEl = "#color",
        cancerEl = "select#cancer",
        cancerFileEl = "input#cancers";

    var infoClasses  = 'alert alert-info',
        warningClasses = 'alert alert-warning',
        successClasses = 'alert alert-success';

    // Perform validation on the form when it is submitted
    $(formEl).submit(function(e){
        e.preventDefault();

        // Extract input data
        var dataset  = $(datasetNameEl).val(),
            aberrationFile = $(aberrationFileEl)[0].files[0],
            snvFile = $(snvFileEl)[0].files[0],
            cnaFile = $(cnaFileEl)[0].files[0],
            sampleFile = $(sampleFileEl)[0].files[0],
            groupName = $(groupNameEl).val(),
            color = $(colorEl).val(),
            cancer = $(cancerEl).val(),
            cancerFile = $(cancerFileEl)[0].files[0];

        // Check if the user passed an SNV/CNA file
        if (!(cnaFile || snvFile || aberrationFile)){
            status('Please choose an aberration, SNV, and/or CNA file.', warningClasses);
            return false;
        }

       // Make sure there's a cancer type or cancer type file
        var cancerValidates = false;
        if (cancerFile && cancerFile.size > 10000000){
            status('Cancer file is too large. Please upload a smaller cancer file.', warningClasses);
            return false;
        }
        else if(cancerFile && cancerFile.type != 'text/plain' && cancerFile.type != 'text/tab-separated-values'){
            status('Cancer file upload: only text and tsv files are allowed.', warningClasses);
            return false;
        }
        else if (!cancerFile && !cancer){
            status('Please choose a cancer or upload a cancer type file.', warningClasses);
        }
        else{
            cancerValidates = true;
        }

        // Make sure there's an aberrations file, and that it is not too large etc.
        var aberrationFileValidates = false;
        if (aberrationFile && aberrationFile.size > 10000000){
            status('Aberration file is too large. Please upload a smaller aberration file.', warningClasses);
            return false;
        }
        else if(aberrationFile && aberrationFile.type != 'text/plain' && aberrationFile.type != 'text/tab-separated-values'){
            status('Aberration file upload: only text and tsv files are allowed.', warningClasses);
            return false;
        }
        else{
            aberrationFileValidates = true;
        }

        // Make sure there's an SNV file, and that it is not too large etc.
        var snvFileValidates = false;
        if (snvFile && snvFile.size > 100000000){
            status('SNV file is too large. Please upload a smaller SNV file.', warningClasses);
            return false;
        }
        else if(snvFile && snvFile.type != 'text/plain' && snvFile.type != 'text/tab-separated-values'){
            status('SNV file upload: only text and tsv files are allowed.', warningClasses);
            return false;
        }
        else{
            snvFileValidates = true;
        }

        // Make sure there's a CNA file, and that it is not too large etc.
        var cnaFileValidates = false;
        if (cnaFile && cnaFile.size > 100000000){
            status('CNA file is too large. Please upload a smaller CNA file.', warningClasses);
            return false;
        }
        else if(cnaFile && cnaFile.type != 'text/plain' && cnaFile.type != 'text/tab-separated-values'){
            status('CNA file upload: only text and tsv files are allowed.', warningClasses);
            return false;
        }
        else{
            cnaFileValidates = true;
        }

        // Make sure that if there's a sample file, it's not too large etc.
        var sampleFileValidates = false;
        if (sampleFile && sampleFile.size > 1000000){
            status('Sample file is too large. Please upload a smaller sample file.', warningClasses);
            return false;
        }
        else if(sampleFile && sampleFile.type != 'text/plain' && sampleFile.type != 'text/tab-separated-values'){
            status('Sample file upload: only text and tsv files are allowed.', warningClasses);
            return false;
        }
        else{
            sampleFileValidates = true;
        }

        // Make sure there's a valid hex color
        function isHexColor(c){ return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(c) }
        var colorValidates = true;
        if (color && !isHexColor(color)){
            colorValidates = false;
            status('Please enter a valid hex color.', warningClasses)
            return false;
        }

        // If everything checks out, submit the form
        if (cancerValidates && aberrationFileValidates && snvFileValidates && cnaFileValidates && sampleFileValidates && colorValidates){
            status('Uploading...', infoClasses);

            // Create a mini-form
            var data = new FormData();
            if (cancerFile)
                data.append( 'cancerMapping', cancerFile );
            if (aberrationFile)
                data.append( 'aberrations', aberrationFile );
            if (snvFile)
                data.append( 'SNVs', snvFile );
            if (cnaFile)
                data.append( 'CNAs', cnaFile );
            if (sampleFile)
                data.append( 'testedSamples', sampleFile );
            
            data.append( 'dataset', dataset );
            data.append( 'groupName', groupName );
            data.append( 'color', color );
            data.append( 'cancer', cancer );

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
