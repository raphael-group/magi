// Form control for when the user is uploading a dataset
$(document).ready(function() {
	///////////////////////////////////////////////////////////////////////////
	// Help the user choose a color for the dataset

	// Create a mapping of cancers to colors
	var cancerToColor = {};
	user_cancers.forEach(function(c){ cancerToColor[c.abbr] = c.color; });
	tcga_icgc_cancers.forEach(function(c){ cancerToColor[c.abbr] = c.color; });

	// Set the color chooser to the given color
	function setColor(color){
		$('#db-color').css('background', color)
		$("input#color").val(color);
		$('span.uploadSummaryDatasetColor').css('background', color);
		$('p.uploadSummaryDatasetColorHex').text(color);
	}

	// Give the user a random color
	function randomColor(){
		setColor('#' + Math.random().toString(16).substr(-6));
	}

	$("a#randomColor").on("click", randomColor);

	//- Update the color as the user changes the color input
	$("input#color").on("change", function(){
		$("span#db-color").css('background', $("input#color").val());
	});

	// Update the color chooser when the user changes the cancer type
	$("select#cancer").on("change", function(){
		setColor(cancerToColor[$("select#cancer").val()]);
	});

	// Initialize color with the first cancer
	setColor(cancerToColor[$("select#cancer").val()]);

	///////////////////////////////////////////////////////////////////////////
	// Respond to choices in the form
	var dataTypes = ["CNA", "SNV", "OtherAberrations", "DataMatrix",
					 "SampleAnnotations", "AnnotationColors"];

	// Toggle the file upload or URL input elements as the user selects
	// file sources
	dataTypes.forEach(function(d){
		var el = $("select#" + d + "FileSource"),
			fileUpload = $("#" + d + "FileUpload").parent(),
			fileURL = $("#" + d + "FileURL");
		el.on("change", function(){
			if (el.val() === "url"){
				fileUpload.hide();
				fileURL.show();
			} else if (el.val() === "upload") {
				fileUpload.show();
				fileURL.hide();
			}
		});
	});

	// Update the file selectors with the name of the files on change
	$(document).on('change', '.btn-file :file', function() {
		var input = $(this),
			label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
		input.trigger('fileselect', [label]);
	});

	$('.btn-file :file').on('fileselect', function(event, label) {
		var labelLength = label.length;
		if (labelLength < 12) var labelAbbr = label;
		else var labelAbbr = label.slice(0, 6) + ".." + label.slice(labelLength-6, labelLength);
		$(this).parent().siblings('abbr.filename')
			.css('margin-left', '5px')
			.css('font-size', '10pt')
			.attr('title', label)
			.html(labelAbbr);
	});
	// Show the data matrix name input when other type is selected
	var DataMatrixName = $("select#DataMatrixName"),
		DataMatrixNameOther = $("input#OtherDataMatrixName");

	DataMatrixName.on("change", function(){
		if (DataMatrixName.val() == "Other"){
			DataMatrixNameOther.show();
		} else {
			DataMatrixNameOther.hide();
		}
	});

	///////////////////////////////////////////////////////////////////////////
	// Validate and then submit the dataset upload

	// Output a simple status bar, using Bootstrap classes to  convey the
	// appropriate sense of urgency
	var statusElement = $("#status"),
		infoClasses  = 'alert alert-info',
		warningClasses = 'alert alert-warning',
		successClasses = 'alert alert-success';

	function status(msg, classes) {
		statusElement.attr('class', classes);
		statusElement.html(msg);
	}

	// Verify that the given file for upload meets our specifications
	function verifyFileUpload(file, fileName) {
		if (file && file.size > 100000000){
			status(fileName+' file is too large. Please upload a smaller file.', warningClasses);
		return false;
		}
		else if(file && file.type != 'text/plain' && file.type != 'text/tab-separated-values' && file.name.substr(-4) != ".maf"){
			console.log(file, file.type)
			status(fileName+' file upload: only MAF, text, and tsv files are allowed.', warningClasses);
			return false;
		}
		else {
			return true;
		}
	}

	// Verify that a string is indeed a hex color
	function isHexColor(c) {
		return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(c)
	}

	// Determine the file source and location for the given data type
	function fileOrURL(d){
		var src = $("#" + d + "FileSource").val();
		if (src == "url"){
			var location = $("#" + d + "FileURL").val();
		} else if (src == "upload"){
			var location = $("#" + d + "FileUpload")[0].files[0];
		}
		else {
			var location = null;
		}
		return { src: src, location: location };
	}

	// Validate and submit the form
	$("#submit").on("click", function(e){
		///////////////////////////////////////////////////////////////////////
		// Stop the form from submitting, as we'll do it through AJAX ourselves
		e.preventDefault();

		// Extract the data we need for our form
		if ($('#DataMatrixName').val() != "Other"){
			var dataMatrixName = $('#DataMatrixName').val();
		}
		else{
			var dataMatrixName = $('#OtherDataMatrixName').val();
		}

		var dataset  = $("#dataset").val(),
			color = $('#color').val(),
			groupName = $('#groupName').val(),
			aberrationType = $("#OtherAberrationsType").val(),
			snvs = fileOrURL("SNV"),
			cnas = fileOrURL("CNA"),
			aberrations = fileOrURL("OtherAberrations"),
			dataMatrix = fileOrURL("DataMatrix"),
			sampleAnnotations = fileOrURL("SampleAnnotations"),
			annotationColors = fileOrURL("AnnotationColors");

		///////////////////////////////////////////////////////////////////////
		// Then validate the data

		// We require a name for all our datasets
		if (!dataset){
			status('Please enter a dataset name.', warningClasses);
			return false;
		}

		// We require a hex color
		if (!color){
			status('Please enter a color.', warningClasses);
			return false;
		} else if (!isHexColor(color)){
			status('Please enter a <i>valid</i> hex color.', warningClasses);
			return false;
		}

		// We require some sort of data to be uploaded
		if (!(cnas.location || snvs.location || aberrations.location || dataMatrix.location)){
			status('Please choose an SNV, CNA, aberration, and/or data matrix file.', warningClasses);
			return false;
		}

		// If a data matrix is supplied, there must be a data name
		if (dataMatrix.location && !dataMatrixName){
			status('Please specify the data type of your data matrix.', warningClasses);
			return false;
		}

		if (aberrations.location && !aberrationType){
			status('Please specify the type of your aberrations.', warningClasses);
			return false;
		}

		// Now that we've checked that we have at least one file, verify the
		// *uploaded* files themselves
		var files = [
			{datum: aberrations, name: 'Aberrations'},
			{datum: cnas, name: 'CNAs'},
			{datum: dataMatrix, name:'Data Matrix'},
			{datum: sampleAnnotations, name: 'Sample Annotations'},
			{datum: snvs, name: 'SNVs'},
			{datum: annotationColors, n: 'Annotation Color File'}
		];

		var verifications = files.map(function(file) {
			if (file.datum.src == 'url'){
				if (file.datum.location.toLowerCase().slice(0, 7) != "http://"){
					status(file.name + " URL: must start with http://.", warningClasses);
				} else {
					return true;
				}
			}
			else return verifyFileUpload(file.datum.location, file.name);
		});
		if (!verifications.every(function(d){ return d; })) return false;

		///////////////////////////////////////////////////////////////////////
		// If everything checks out, then finally construct then submit our form
		var form = new FormData();

		// Append meta data
		form.append( 'Dataset', dataset );
		form.append( 'GroupName', groupName );
		form.append( 'Color', color );
		form.append( 'Cancer', $('#cancer').val() );

		// Append the files that the user provided
		if (snvs){
			form.append( 'SNVsLocation', snvs.location );
			form.append( 'SNVsSource', snvs.src );
			form.append( 'SNVFileFormat', $('select#SNVFileFormat').val() );
		}
		if (cnas){
			form.append( 'CNAsLocation', cnas.location );
			form.append( 'CNAsSource', cnas.src );
			form.append( 'CNAFileFormat', $('select#CNAFileFormat').val() );
		}
		if (aberrations){
			form.append( 'AberrationsLocation', aberrations.location );
			form.append( 'AberrationsSource', aberrations.src );
			form.append( 'AberrationType', aberrationType );
		}
		if (dataMatrix){
			form.append( 'DataMatrixLocation', dataMatrix.location );
			form.append( 'DataMatrixSource', dataMatrix.src );
			form.append( 'DataMatrixName', dataMatrixName);
		}
		if (sampleAnnotations){
			form.append( 'SampleAnnotationsLocation', sampleAnnotations.location );
			form.append( 'SampleAnnotationsSource', sampleAnnotations.src );
		}
		if (annotationColors){
			form.append( 'AnnotationColorsLocation', annotationColors.location );
			form.append( 'AnnotationColorsSource', annotationColors.src );
		}

		// Submit an AJAX-ified form
		status('Uploading data...', infoClasses);
		$.ajax({
			// Note: can't use JSON otherwise IE8 will pop open a dialog
			// window trying to download the JSON as a file
			url: '/upload/dataset',
			data: form,
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
				status(response.status, successClasses);
				if (response.output){
					$("div#output").html("<pre>" + response.output + "</pre>");
				}
			}
		});
	});
});