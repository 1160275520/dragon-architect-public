function makeItem(item) {
    var span = document.createElement("span");
    span.id = 'item_' + item.name.split(" ").join("_");
    $(span).addClass('galleryItem');
    var titleDiv = document.createElement("div");
    $(titleDiv).addClass("titleDiv");
    var title = document.createElement("p");
    title.innerHTML = item.name;
    $(titleDiv).append(title);
    var div = document.createElement("div");
    $(span).append(titleDiv);
    $(span).append(div);

    var content = document.createElement("div");
    var thumb = document.createElement("img");
    thumb.src = item.screen;
    $(content).append(thumb);

    $(div).append(content);
    return span;
}

function makeGallery(data, group, selector) {
    var items = data.filter(function (item) {
        return item.projects.length > 0 && item.projects.some(function (i) {
                return i.group === group;
            });
    });
    items.forEach(function(item) {
        item.projects.forEach(function(project) {
            if (project.group === group) {
                var i = makeItem(project);
                selector.append(i);
            }
        });
    });
}

$.getJSON("spl_gallery_data.json", function (data) {
    $("#loading").hide();
    makeGallery(data, "SPL", $("#galleryItems"));
});