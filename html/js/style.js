$(function() {
// Open close dropdown on click
    $("a.dropdown-toggle").on('click', function(){
        console.log('open close', this);
        if($(this).hasClass("open")) {
            console.log('close', this);
            $(this).find(".dropdown-menu").slideUp("fast");
            $(this).removeClass("open");
        }
        else { 
            console.log('open', this);
            $(this).find(".dropdown-menu").slideDown("fast");
            $(this).find("#dev-select-pack").css("display: block;");
            $(this).toggleClass("open");
            $('.dropdown').removeClass("show");
            $('.dropdown-menu').removeClass("show");
        }
    });

    // Close dropdown on mouseleave
    $("li.dropdown").mouseleave(function(){
        console.log('mouseleave', this);
        $(this).find(".dropdown-menu").slideUp("fast");
        // $(this).find("#dev-select-pack").css("display: none;");
        // $(this).removeClass("open");
    });

    // // Navbar toggle
    // $(".navbar-toggle").on('click',function(){
    //     $(".navbar-collapse").toggleClass("collapse").slideToggle("fast");
    // });

});