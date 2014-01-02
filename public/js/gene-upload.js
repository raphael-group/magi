// Function for AJAX-ified file upload
$(document).ready(function() {
    // Check to see when a user has selected a file
    $('#geneSet').on('change', function(){

        // Parse the first file given by the user
        var file = this.files[0]
        , name = file.name
        , size = file.size
        , type = file.type;

        // Make sure the file is of appropriate size and type
        if(file.name.length < 1) {
            status('Cannot upload empty file.', 'alert alert-warning');
        }
        else if(file.size > 100000) {
            status('File is too large. Please upload a smaller file.', 'alert alert-warning');
        }
        else if(file.type != 'text/plain'){
            status('File upload: only text files are allowed.', 'alert alert-warning');
        }
        // If everything checks out, submit a ajax POST request
        else { 
            status('Uploading...', 'alert alert-info');

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
                        status('File upload: Oops, something bad happened.', 'alert alert-warning');
                        return;
                    }

                    var genes = response.genes;
                    
                    status("Upload complete.", "alert alert-success");
                    $('#genes-list').val(genes);
                }
            });
        }

    });

    function status(msg, classes) {
        $("#status").attr('class', classes);
        $('#status').text(msg);
    }
});
