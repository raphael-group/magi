function validateData(dataset,color,groupName, snvFile, cnaFile, aberrationFile, sampleTypesFile) {
    console.log(dataset);
    console.log(color);
    console.log(groupName);
    console.log(snvFile);
    console.log(cnaFile);
    console.log(aberrationFile);
    console.log(sampleTypesFile);
}

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
        colorEl = "#color";

    var infoClasses  = 'alert alert-info',
        warningClasses = 'alert alert-warning',
        successClasses = 'alert alert-success';

    // Load default upload state
    $('.uploadSelectorOption').each(function() {
        if($(this).hasClass('defaultUploadSelectorOption')) {
            $(this).css('background', '#ccc');
        }
    });
    $('.selectorViewOption').each(function() {
        if($(this).hasClass('snvUploadSelector') == false) {
            $(this).css('visibility','hidden').css('display','none');
        }
    });

    // Sync the summary bar with text fields
    $('#dataset').on('change', function() {
        $('.uploadSummaryDatasetName').text($(this).val());
    });
    $('#groupName').on('change', function() {
        $('.uploadSummaryGroupName').text($('#groupName').val());
        if( $(this).val() == '') {
            $('.uploadSummaryGroupName').css('visibility','hidden').css('display','none');
            $('.uploadSummaryGroupNameHeader').css('visibility','hidden').css('display','none');
        } else {
            $('.uploadSummaryGroupName').css('visibility','visible').css('display','block');
            $('.uploadSummaryGroupNameHeader').css('visibility','visible').css('display','block');
        }
    });
    $('#color').on('change', function() {
        $('.uploadSummaryDatasetColor').css('background', $('#color').val());
        $('.uploadSummaryDatasetColorHex').text($('#color').val());
    });
    $('#randomColor').click(function() {
        $('.uploadSummaryDatasetColor').css('background', $('#color').val());
        $('.uploadSummaryDatasetColorHex').text($('#color').val());
    });

    // Sync the summary bar with upload file changes
    $('#SNVs').change(function() {
        var uploadPath = $(this).val(),
            file = uploadPath.split(/[\\]+/).pop();
        $('.uploadSummarySNV').text(file);
    });
    $('#CNAs').change(function() {
        var uploadPath = $(this).val(),
            file = uploadPath.split(/[\\]+/).pop();
        $('.uploadSummaryCNA').text(file);
    })
    $('#OtherAberrations').change(function() {
        var uploadPath = $(this).val(),
            file = uploadPath.split(/[\\]+/).pop();
        $('.uploadSummaryOtherAbberation').text(file);
    });
    $('#SampleTypes').change(function() {
        var uploadPath = $(this).val(),
            file = uploadPath.split(/[\\]+/).pop();
        $('.uploadSummarySampleTypes').text(file);
    });
    $('#DataMatrix').change(function() {
        var uploadPath = $(this).val(),
            file = uploadPath.split(/[\\]+/).pop();
        $('.uploadSummaryDataMatrix').text(file);
    })

    // Change viewable DIV on menu click
    $('.uploadSelectorOption').click(function(e) {
        e.preventDefault();
        $('.uploadSelectorOption').css('background', 'none');
        $(this).css('background', '#ccc');
        var uploadSelectType = $(this).attr('data-selector-type'),
            selectorArea = '';
        if(uploadSelectType == 'CNA') {
            selectorArea = '.cnvUploadSelector';
        } else if (uploadSelectType == 'SNV') {
            selectorArea = '.snvUploadSelector';
        } else if (uploadSelectType == 'OtherAberration') {
            selectorArea = '.otherAberrationUploadSelector';
        } else if (uploadSelectType == 'Methylation') {
            selectorArea = '.methylationUploadSelector';
        } else if (uploadSelectType == 'SampleType') {
            selectorArea = '.sampleTypeUploadSelector';
        } else if (uploadSelectType == 'DataMatrix') {
            selectorArea = '.dataMatrixUploadSelector';
        }
        $('.selectorViewOption').css('visibility','hidden').css('display','none');
        $(selectorArea).css('visibility', 'visible').css('display', 'block');
    });

    $('#submit').click(function(e) {
        e.preventDefault();

        var dataset  = $(datasetNameEl).val(),
            color = $('#color').val(),
            groupName = $('#groupName').val(),

            snvFile = $('#SNVs')[0].files[0],
            cnaFile = $('#CNAs')[0].files[0],
            aberrationFile = $('#OtherAberrations')[0].files[0],
            sampleTypesFile = $('#SampleTypes')[0].files[0];

        
    });
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
            color = $(colorEl).val();

        // Check if the user passed an SNV/CNA file
        if (!(cnaFile || snvFile || aberrationFile)){
            status('Please choose an aberration, SNV, and/or CNA file.', warningClasses);
            return false;
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
        if (snvFile && snvFile.size > 10000000){
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
        if (cnaFile && cnaFile.size > 10000000){
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
        if (aberrationFileValidates && snvFileValidates && cnaFileValidates && sampleFileValidates && colorValidates) {
            status('Uploading...', infoClasses);

            // Create a mini-form
            var data = new FormData();
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
