$(document).ready(function(){
	// Open close dropdown on click
	$("li.dropdown").hover(function(){
		if($(this).hasClass("open")) {
			console.log();
		}
		else { 
			$(this).find(".dropdown-menu").stop().slideDown("fast");

			$(this).addClass("open");
		}
	});

	// Close dropdown on mouseleave
	$("li.dropdown").mouseleave(function(){
		$(this).find(".dropdown-menu").stop().slideUp("fast");
			$(this).removeClass("open");
	});

	$(".dropdown-menu").mouseout(function(){
		console.log();
	});

});