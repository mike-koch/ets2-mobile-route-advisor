$(document).ready(function() {
    // Get list of languages
    $.ajax({
        accept: 'application/json',
        dataType: 'json',
        method: 'GET',
        url: 'https://api.github.com/repos/mkoch227/ets2-mobile-route-advisor/contents?ref=i18n',
        success: outputLanguages,
        error: outputLanguageError
    });
});

function outputLanguages(files) {
    /* Don't display the following files:
        - .travis.yml
        - README.md
    */
    for (file in files) {
        var theFile = files[file];
        var fileName = theFile.name;
        if (fileName != '.travis.yml' && fileName != 'README.md') {
            var listItem = '<li>';
            listItem += '<a href="' + theFile.download_url + '" download>';
            listItem += fileName.replace('.json', '');
            listItem += '</a>';
            listItem += '</li>';
            
            $('#language-list').append(listItem);
        }
    }
}

function outputLanguageError(data) {
    console.error(data);
}