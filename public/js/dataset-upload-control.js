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
    multiDatasetEl = "input#multi-dataset";

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
$('.uploadSummaryCancerType').text($('#cancer').val().toUpperCase());
$('#cancer').on('change', function() {
    $('.uploadSummaryCancerType').text($(this).val().toUpperCase());
});
$('#cancers').on('change', function() {
    var uploadPath = $(this).val(),
        file = uploadPath.split(/[\\]+/).pop();
    $('.uploadSummaryCancerType').text(file);
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
$('#SampleAnnotations').change(function() {
    var uploadPath = $(this).val(),
        file = uploadPath.split(/[\\]+/).pop();
    $('.uploadSummarySampleAnnotations').text(file);
});
$('#AnnotationColors').change(function() {
    var uploadPath = $(this).val(),
        file = uploadPath.split(/[\\]+/).pop();
    $('.uploadSummaryAnnotationColors').text(file);
});
$('#DataMatrix').change(function() {
    var uploadPath = $(this).val(),
        file = uploadPath.split(/[\\]+/).pop();
    $('.uploadSummaryDataMatrix').text(file);
});

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
    } else if (uploadSelectType == 'SampleAnnotations') {
        selectorArea = '.sampleAnnotationsUploadSelector';
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

        aberrationFile = $('#OtherAberrations')[0].files[0],
        cnaFile = $('#CNAs')[0].files[0],
        dataMatrixFile = $('#DataMatrix')[0].files[0],
        sampleAnnotationsFile = $('#SampleAnnotations')[0].files[0],
        annotationColorsFile = $('#AnnotationColors')[0].files[0],
        snvFile = $('#SNVs')[0].files[0],
        cancerMappingFile = $("#cancers")[0].files[0];


    // Validate data
    var isDataValid = validateData(dataset, color, groupName, aberrationFile, cnaFile,
                                   dataMatrixFile, sampleAnnotationsFile, annotationColorsFile,
                                   snvFile, cancerMappingFile);
    // If validation fails, we don't need to post an error, since that will be
    // posted as part of the validateDate call itself
    if (isDataValid == false) return;
    submitData(dataset, color, groupName, aberrationFile, cnaFile, dataMatrixFile,
               sampleAnnotationsFile, annotationColorsFile, snvFile, cancerMappingFile);
});

////////////////////////////////////////////////////////////////////////////////////////////////////
// Functions

function status(msg, classes) {
    $("#status").attr('class', classes);
    $('#status').html(msg);
}

function submitData(dataset, color, groupName, aberrationFile, cnaFile, dataMatrixFile,
                    sampleAnnotationsFile, annotationColorsFile, snvFile, cancerMappingFile) {
    // If everything checks out, submit the form
    status('Uploading...', infoClasses);

    // Create a mini-form
    var data = new FormData();
    if (aberrationFile) data.append( 'Aberrations', aberrationFile );
    if (cnaFile) data.append( 'CNAs', cnaFile );
    if (dataMatrixFile) data.append( 'DataMatrix', dataMatrixFile);
    if (sampleAnnotationsFile) data.append( 'SampleAnnotations', sampleAnnotationsFile);
    if (annotationColorsFile) data.append( 'AnnotationColors', annotationColorsFile);
    if (snvFile) data.append( 'SNVs', snvFile );
    if (cancerMappingFile) data.append( 'CancerMapping', cancerMappingFile );

    data.append( 'dataset', dataset );
    data.append( 'groupName', groupName );
    data.append( 'color', color );
    data.append('cancer', $('#cancer').val());

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

function validateData(dataset, color, groupName, aberrationFile, cnaFile, dataMatrixFile, sampleAnnotationsFile, annotationColorsFile, snvFile, cancerMappingFile) {
    // Verify if a file meets MAGI requirements, error if not
    function verifyFile(file, fileName) {
        if (file && file.size > 100000000){
            status(fileName+' file is too large. Please upload a smaller file.', warningClasses);
            return false;
        }
        else if(file && file.type != 'text/plain' && file.type != 'text/tab-separated-values'){
            status(fileName+' file upload: only text and tsv files are allowed.', warningClasses);
            return false;
        }
        else {
            return true;
        }
    }

    // True if color HEX code is valid
    function isHexColor(c) {
        return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(c)
    }

    // If no dataset name is given, return false
    var isMulti = $(multiDatasetEl).is(":checked");
    if (!isMulti && !dataset) {
        status('Please enter a valid dataset name.', warningClasses);
        return false;
    }

    // Check the other conditions for multiple datasets
    if (isMulti && !groupName){
        status('Please enter a valid group name, since you are uploading multiple datasets.', warningClasses);
        return false;
    }

    if (isMulti && !sampleAnnotationsFile){
        status('Please choose a sample annotations file. This is required for uploading multiple datasets simultaneously.', warningClasses);
        return false;
    }

    if (isMulti && !cancerMappingFile){
        status('Please choose a cancer mapping file. This is required for uploading multiple datasets simultaneously.', warningClasses);
        return false;
    }

    // Check if provided color is valid
    if (!isMulti && color && !isHexColor(color)){
        colorValidates = false;
        status('Please enter a valid hex color.', warningClasses);
        return false;
    }

    // Check if the user passed an SNV/CNA file
    if (!(cnaFile || snvFile || aberrationFile || dataMatrixFile)){
        console.log(snvFile)
        status('Please choose an aberration, data matrix, SNV, and/or CNA file.', warningClasses);
        return false;
    }

    var files = [
        {f: aberrationFile, n:'Aberration'},
        {f: cnaFile, n:'CNA'},
        {f: dataMatrixFile, n:'Data Matrix'},
        {f: sampleAnnotationsFile, n:'Sample Annotations'},
        {f: snvFile, n:'SNV'},
        {f: annotationColorsFile, n: 'Annotation Color File'}
    ];

    // Verify only if files are empty or valid file
    var verifications = files.map(function(file) { return verifyFile(file.f, file.n); }),
        isVerified = verifications.reduce(function(prev,now) { return prev && now; });

    return isVerified;
}

}); // end $ready()
