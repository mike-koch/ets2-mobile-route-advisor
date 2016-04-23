$(document).ready(function() {
    $('#language-list').html('');
    
    // Get list of languages
    $.ajax({
        accept: 'application/json',
        dataType: 'json',
        method: 'GET',
        url: 'https://api.github.com/repos/mike-koch/ets2-mobile-route-advisor/contents?ref=i18n',
        success: outputLanguages,
        error: outputLanguageError
    });
});

function outputLanguages(files) {
    var list = '<ul>';
    for (file in files) {
        var theFile = files[file];
        var fileName = theFile.name;

        /* Don't display the following files:
            - .travis.yml
            - README.md
        */
        if (fileName != '.travis.yml' && fileName != 'README.md') {
            list += '<li>';
            list += '<a href="' + theFile.download_url + '" download>';
            list += fileName.replace('.json', '');
            list += '</a>';
            list += '</li>';
        }
    }
    $('#language-list').append(list + '</ul>');
}

function outputLanguageError(data) {
    console.error(data);
}