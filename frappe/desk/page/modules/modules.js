frappe.pages['modules'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Modules',
		single_column: false
	});

	frappe.modules_page = page;
	frappe.module_links = {};
	page.section_data = {};

	page.wrapper.find('.page-head h1').css({'padding-left': '15px'});
	// page.wrapper.find('.page-content').css({'margin-top': '0px'});

	// menu
	page.add_menu_item(__('Set Desktop Icons'), function() {
		frappe.frappe_toolbar.modules_select
			.show(frappe.session.user);
	});

	let quick_link = frappe.boot.page_quick_links ? frappe.boot.page_quick_links[0] : null;

	if(quick_link) {
		this.page.set_secondary_action(
			quick_link.label,
			() => { 
				frappe.set_route(quick_link.link); 
			}
		);
	}

	if(frappe.user.has_role('System Manager')) {
		page.add_menu_item(__('Install Apps'), function() {
			frappe.set_route("applications");
		});
	}

	page.get_page_modules = () => {
		return frappe.get_desktop_icons(true)
			.filter(d => d.type==='module' && !d.blocked)
			.sort((a, b) => { return (a._label > b._label) ? 1 : -1; });
	};

	let get_module_sidebar_item = (item) => `<li class="strong module-sidebar-item">
		<a class="module-link" data-name="${item.module_name}" href="#${item.link}">
			<i class="fa fa-chevron-right pull-right" style="display: none;"></i>
			<span>${item._label}</span>
		</a>
	</li>`;

	let get_sidebar_html = () => {
		let sidebar_items_html = page.get_page_modules()
			.map(get_module_sidebar_item.bind(this)).join("");

		return `<ul class="module-sidebar-nav overlay-sidebar nav nav-pills nav-stacked">
			${sidebar_items_html}
			<li class="divider"></li>
		</ul>`;
	};

	// render sidebar
	page.sidebar.html(get_sidebar_html());

	// help click
	page.main.on("click", '.module-section-link[data-type="help"]', function() {
		frappe.help.show_video($(this).attr("data-youtube-id"));
		return false;
	});

	// notifications click
	page.main.on("click", '.open-notification', function() {
		var doctype = $(this).attr('data-doctype');
		if(doctype) {
			frappe.ui.notifications.show_open_count_list(doctype);
		}
	});

	page.activate_link = function(link) {
		page.last_link = link;
		page.wrapper.find('.module-sidebar-item.active, .module-link.active').removeClass('active');
		$(link).addClass('active').parent().addClass("active");
		show_section($(link).attr('data-name'));
	};

	var show_section = function(module_name) {
		if (!module_name) return;
		if(module_name in page.section_data) {
			render_section(page.section_data[module_name]);
		} else {
			page.main.empty();
			return frappe.call({
				method: "frappe.desk.moduleview.get",
				args: {
					module: module_name
				},
				callback: function(r) {
					var m = frappe.get_module(module_name);
					m.data = r.message.data;
					process_data(module_name, m.data);
					page.section_data[module_name] = m;
					render_section(m);
				},
				freeze: true,
			});
		}

	};

	var render_section = function(m) {
		page.set_title(__(m.label));
		page.main.html(frappe.render_template('modules_section', m));

		// if(frappe.utils.is_xs() || frappe.utils.is_sm()) {
		// 	// call this after a timeout, becuase a refresh will set the page to the top
		// 	setTimeout(function() {
		// 		$(document).scrollTop($('.module-body').offset().top - 150);
		// 	}, 100);
		// }

		//setup_section_toggle();
		frappe.app.update_notification_count_in_modules();
	};

	var process_data = function(module_name, data) {
		frappe.module_links[module_name] = [];
		data.forEach(function(section) {
			section.items.forEach(function(item) {
				item.style = '';
				if(item.type==="doctype") {
					item.doctype = item.name;

					// map of doctypes that belong to a module
					frappe.module_links[module_name].push(item.name);
				}
				if(!item.route) {
					if(item.link) {
						item.route=strip(item.link, "#");
					}
					else if(item.type==="doctype") {
						if(frappe.model.is_single(item.doctype)) {
							item.route = 'Form/' + item.doctype;
						} else {
							if (item.filters) {
								frappe.route_options=item.filters;
							}
							item.route="List/" + item.doctype;
							//item.style = 'font-weight: 500;';
						}
						// item.style = 'font-weight: bold;';
					}
					else if(item.type==="report" && item.is_query_report) {
						item.route="query-report/" + item.name;
					}
					else if(item.type==="report") {
						item.route="List/" + item.doctype + "/Report/" + item.name;
					}
					else if(item.type==="page") {
						item.route=item.name;
					}
				}

				if(item.route_options) {
					item.route += "?" + $.map(item.route_options, function(value, key) {
						return encodeURIComponent(key) + "=" + encodeURIComponent(value); }).join('&');
				}

				if(item.type==="page" || item.type==="help" || item.type==="report" ||
				(item.doctype && frappe.model.can_read(item.doctype))) {
					item.shown = true;
				}
			});
		});
	};
};

frappe.pages['modules'].on_page_show = function(wrapper) {
	let route = frappe.get_route();
	let modules = frappe.modules_page.get_page_modules().map(d => d.module_name);
	$("body").attr("data-sidebar", 1);
	if(route.length > 1) {
		// activate section based on route
		let module_name = route[1];
		if(modules.includes(module_name)) {
			frappe.modules_page.activate_link(
				frappe.modules_page.sidebar.find('.module-link[data-name="'+ module_name +'"]'));
		} else {
			frappe.throw(__(`Module ${module_name} not found.`));
		}
	} else if(frappe.modules_page.last_link) {
		// open last link
		frappe.set_route('modules', frappe.modules_page.last_link.attr('data-name'));
	} else {
		// first time, open the first page
		frappe.modules_page.activate_link(frappe.modules_page.sidebar.find('.module-link:first'));
	}
};
