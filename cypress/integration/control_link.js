context("Control Link", () => {
	before(() => {
		cy.login();
		cy.visit("/app/website");
	});

	beforeEach(() => {
		cy.visit("/app/website");
		cy.create_records({
			doctype: "ToDo",
			description: "this is a test todo for link",
		}).as("todos");
	});

	function get_dialog_with_link() {
		return cy.dialog({
			title: "Link",
			fields: [
				{
					label: "Select ToDo",
					fieldname: "link",
					fieldtype: "Link",
					options: "ToDo",
				},
			],
		});
	}

	function get_dialog_with_user_link() {
		return cy.dialog({
			title: "Link",
			fields: [
				{
					label: "Select User",
					fieldname: "link",
					fieldtype: "Link",
					options: "User",
				},
			],
		});
	}

	it("should set the valid value", () => {
		get_dialog_with_link().as("dialog");

		cy.insert_doc(
			"Property Setter",
			{
				doctype: "Property Setter",
				doc_type: "User",
				property: "translate_link_fields",
				property_type: "Check",
				doctype_or_field: "DocType",
				value: "0",
			},
			true
		);

		cy.insert_doc(
			"Property Setter",
			{
				doctype: "Property Setter",
				doc_type: "ToDo",
				property: "show_title_field_in_link",
				property_type: "Check",
				doctype_or_field: "DocType",
				value: "0",
			},
			true
		);

		cy.intercept("POST", "/api/method/frappe.desk.search.search_link").as("search_link");

		cy.get(".frappe-control[data-fieldname=link] input").focus().as("input");
		cy.wait("@search_link");
		cy.get("@input").type("todo for link", { delay: 200 });
		cy.wait("@search_link");
		cy.get(".frappe-control[data-fieldname=link]").findByRole("listbox").should("be.visible");
		cy.get(".frappe-control[data-fieldname=link] input").type("{enter}", { delay: 100 });
		cy.get(".frappe-control[data-fieldname=link] input").blur();
		cy.get("@dialog").then((dialog) => {
			cy.get("@todos").then((todos) => {
				let value = dialog.get_value("link");
				expect(value).to.eq(todos[0]);
			});
		});
	});

	it("should unset invalid value", () => {
		get_dialog_with_link().as("dialog");

		cy.intercept("POST", "/api/method/frappe.client.validate_link").as("validate_link");

		cy.get(".frappe-control[data-fieldname=link] input")
			.type("invalid value", { delay: 100 })
			.blur();
		cy.wait("@validate_link");
		cy.get(".frappe-control[data-fieldname=link] input").should("have.value", "");
	});

	it("should be possible set empty value explicitly", () => {
		get_dialog_with_link().as("dialog");

		cy.intercept("POST", "/api/method/frappe.client.validate_link").as("validate_link");

		cy.get(".frappe-control[data-fieldname=link] input").type("  ", { delay: 100 }).blur();
		cy.wait("@validate_link");
		cy.get(".frappe-control[data-fieldname=link] input").should("have.value", "");
		cy.window()
			.its("cur_dialog")
			.then((dialog) => {
				expect(dialog.get_value("link")).to.equal("");
			});
	});

	it("should route to form on arrow click", () => {
		get_dialog_with_link().as("dialog");

		cy.intercept("POST", "/api/method/frappe.client.validate_link").as("validate_link");
		cy.intercept("POST", "/api/method/frappe.desk.search.search_link").as("search_link");

		cy.get("@todos").then((todos) => {
			cy.get(".frappe-control[data-fieldname=link] input").as("input");
			cy.get("@input").focus();
			cy.wait("@search_link");
			cy.get("@input").type(todos[0]).blur();
			cy.wait("@validate_link");
			cy.get("@input").focus();
			cy.wait(500); // wait for arrow to show
			cy.get(".frappe-control[data-fieldname=link] .btn-open").should("be.visible").click();
			cy.location("pathname").should("eq", `/app/todo/${todos[0]}`);
		});
	});

	it("show title field in link", () => {
		cy.insert_doc(
			"Property Setter",
			{
				doctype: "Property Setter",
				doc_type: "User",
				property: "translate_link_fields",
				property_type: "Check",
				doctype_or_field: "DocType",
				value: "0",
			},
			true
		);

		cy.insert_doc(
			"Property Setter",
			{
				doctype: "Property Setter",
				doc_type: "ToDo",
				property: "show_title_field_in_link",
				property_type: "Check",
				doctype_or_field: "DocType",
				value: "1",
			},
			true
		);

		cy.clear_cache();
		cy.wait(500);

		get_dialog_with_link().as("dialog");
		cy.window()
			.its("frappe")
			.then((frappe) => {
				if (!frappe.boot) {
					frappe.boot = {
						link_title_doctypes: ["ToDo"],
					};
				} else {
					frappe.boot.link_title_doctypes = ["ToDo"];
				}
			});

		cy.intercept("POST", "/api/method/frappe.desk.search.search_link").as("search_link");

		cy.get(".frappe-control[data-fieldname=link] input").focus().as("input");
		cy.wait("@search_link");
		cy.get("@input").type("todo for link");
		cy.wait("@search_link");
		cy.get(".frappe-control[data-fieldname=link] ul").should("be.visible");
		cy.get(".frappe-control[data-fieldname=link] input").type("{enter}", { delay: 100 });
		cy.get(".frappe-control[data-fieldname=link] input").blur();
		cy.get("@dialog").then((dialog) => {
			cy.get("@todos").then((todos) => {
				let field = dialog.get_field("link");
				let value = field.get_value();
				let label = field.get_label_value();

				expect(value).to.eq(todos[0]);
				expect(label).to.eq("this is a test todo for link");
			});
		});
	});

	it("should update dependant fields (via fetch_from)", () => {
		cy.get("@todos").then((todos) => {
			cy.visit(`/app/todo/${todos[0]}`);
			cy.intercept("POST", "/api/method/frappe.desk.search.search_link").as("search_link");
			cy.intercept("POST", "/api/method/frappe.client.validate_link").as("validate_link");

			cy.get(".frappe-control[data-fieldname=assigned_by] input").focus().as("input");
			cy.get("@input").type("Administrator", { delay: 100 }).blur();
			cy.wait("@validate_link");
			cy.get(".frappe-control[data-fieldname=assigned_by_full_name] .control-value").should(
				"contain",
				"Administrator"
			);

			cy.window().its("cur_frm.doc.assigned_by").should("eq", "Administrator");

			// invalid input
			cy.get("@input").clear().type("invalid input", { delay: 100 }).blur();
			cy.get(".frappe-control[data-fieldname=assigned_by_full_name] .control-value").should(
				"contain",
				""
			);

			cy.window().its("cur_frm.doc.assigned_by").should("eq", null);

			// set valid value again
			cy.get("@input").clear().focus();
			cy.wait("@search_link");
			cy.get("@input").type("Administrator", { delay: 100 }).blur();
			cy.wait("@validate_link");

			cy.window().its("cur_frm.doc.assigned_by").should("eq", "Administrator");

			// clear input
			cy.get("@input").clear().blur();
			cy.get(".frappe-control[data-fieldname=assigned_by_full_name] .control-value").should(
				"contain",
				""
			);

			cy.window().its("cur_frm.doc.assigned_by").should("eq", "");
		});
	});

	it("should set default values", () => {
		cy.insert_doc(
			"Property Setter",
			{
				doctype_or_field: "DocField",
				doc_type: "ToDo",
				field_name: "assigned_by",
				property: "default",
				property_type: "Text",
				value: "Administrator",
			},
			true
		);
		cy.reload();
		cy.new_form("ToDo");
		cy.fill_field("description", "new", "Text Editor");
		cy.intercept("POST", "/api/method/frappe.desk.form.save.savedocs").as("save_form");
		cy.findByRole("button", { name: "Save" }).click();
		cy.wait("@save_form");
		cy.get(".frappe-control[data-fieldname=assigned_by_full_name] .control-value").should(
			"contain",
			"Administrator"
		);
		// if user clears default value explicitly, system should not reset default again
		cy.get_field("assigned_by").clear().blur();
		cy.intercept("POST", "/api/method/frappe.desk.form.save.savedocs").as("save_form");
		cy.findByRole("button", { name: "Save" }).click();
		cy.wait("@save_form");
		cy.get_field("assigned_by").should("have.value", "");
		cy.get(".frappe-control[data-fieldname=assigned_by_full_name] .control-value").should(
			"contain",
			""
		);
	});

	it("show translated text for link with show_title_field_in_link enabled", () => {
		cy.insert_doc(
			"Property Setter",
			{
				doctype: "Property Setter",
				doc_type: "ToDo",
				property: "translate_link_fields",
				property_type: "Check",
				doctype_or_field: "DocType",
				value: "1",
			},
			true
		);

		cy.insert_doc(
			"Property Setter",
			{
				doctype: "Property Setter",
				doc_type: "ToDo",
				property: "show_title_field_in_link",
				property_type: "Check",
				doctype_or_field: "DocType",
				value: "1",
			},
			true
		);

		cy.window()
			.its("frappe")
			.then((frappe) => {
				cy.insert_doc("Translation", {
					doctype: "Translation",
					language: frappe.boot.lang,
					source_text: "this is a test todo for link",
					translated_text: "this is a translated test todo for link",
				});
			});

		cy.clear_cache();
		cy.wait(500);

		cy.window()
			.its("frappe")
			.then((frappe) => {
				if (!frappe.boot) {
					frappe.boot = {
						link_title_doctypes: ["ToDo"],
						translatable_doctypes: ["ToDo"],
					};
				} else {
					frappe.boot.link_title_doctypes = ["ToDo"];
					frappe.boot.translatable_doctypes = ["ToDo"];
				}
			});

		get_dialog_with_link().as("dialog");
		cy.intercept("POST", "/api/method/frappe.desk.search.search_link").as("search_link");

		cy.get(".frappe-control[data-fieldname=link] input").focus().as("input");
		cy.wait("@search_link");
		cy.get("@input").type("todo for link", { delay: 100 });
		cy.wait("@search_link");
		cy.get(".frappe-control[data-fieldname=link] ul").should("be.visible");
		cy.get(".frappe-control[data-fieldname=link] input").type("{enter}", { delay: 100 });
		cy.get(".frappe-control[data-fieldname=link] input").blur();
		cy.get("@dialog").then((dialog) => {
			cy.get("@todos").then((todos) => {
				let field = dialog.get_field("link");
				let value = field.get_value();
				let label = field.get_label_value();

				expect(value).to.eq(todos[0]);
				expect(label).to.eq("this is a translated test todo for link");
			});
		});
	});

	it("show translated text for link with show_title_field_in_link disabled", () => {
		cy.insert_doc(
			"Property Setter",
			{
				doctype: "Property Setter",
				doc_type: "User",
				property: "translate_link_fields",
				property_type: "Check",
				doctype_or_field: "DocType",
				value: "1",
			},
			true
		);

		cy.insert_doc(
			"Property Setter",
			{
				doctype: "Property Setter",
				doc_type: "ToDo",
				property: "show_title_field_in_link",
				property_type: "Check",
				doctype_or_field: "DocType",
				value: "0",
			},
			true
		);

		cy.window()
			.its("frappe")
			.then((frappe) => {
				cy.insert_doc("Translation", {
					doctype: "Translation",
					language: frappe.boot.lang,
					source_text: "test@erpnext.com",
					translated_text: "translatedtest@erpnext.com",
				});
			});

		cy.clear_cache();
		cy.wait(500);

		cy.window()
			.its("frappe")
			.then((frappe) => {
				if (!frappe.boot) {
					frappe.boot = {
						translatable_doctypes: ["User"],
					};
				} else {
					frappe.boot.translatable_doctypes = ["User"];
				}
			});

		get_dialog_with_user_link().as("dialog");
		cy.intercept("POST", "/api/method/frappe.desk.search.search_link").as("search_link");

		cy.get(".frappe-control[data-fieldname=link] input").focus().as("input");
		cy.wait("@search_link");
		cy.get("@input").type("test@erpnext.com", { delay: 100 });
		cy.wait("@search_link");
		cy.get(".frappe-control[data-fieldname=link] ul").should("be.visible");
		cy.get(".frappe-control[data-fieldname=link] input").type("{enter}", { delay: 100 });
		cy.get(".frappe-control[data-fieldname=link] input").blur();
		cy.get("@dialog").then((dialog) => {
			let field = dialog.get_field("link");
			let value = field.get_value();
			let label = field.get_label_value();

			expect(value).to.eq("test@erpnext.com");
			expect(label).to.eq("translatedtest@erpnext.com");
		});
	});
});
