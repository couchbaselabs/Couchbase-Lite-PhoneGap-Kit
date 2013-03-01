var showdownConverter = new Showdown.converter();

function wikiToHtml(string) {
    if (!string) return "";
    var linkPrefix = "#/wiki/"+currentWiki+'/';
    string = string.replace(/([A-Z][a-z]*[A-Z][A-Za-z]*)/gm, "[$1]("+linkPrefix+"$1)");
    string = string.replace(/\[\[(.*)\]\]/gm,"[$1]("+linkPrefix+"$1)");
    return showdownConverter.makeHtml(string);
}

exports.wikiToHtml = wikiToHtml;
