context("Web Form", () => {
	before(() => {
		cy.login();
	});

	it("Create Web Form", () => {
		cy.visit("/app/web-form/new");

		cy.intercept("POST", "/api/method/frappe.desk.form.save.savedocs").as("save_form");

		cy.fill_field("title", "Note");
		cy.fill_field("doc_type", "Note", "Link");
		cy.fill_field("module", "Website", "Link");
		cy.click_custom_action_button("Get Fields");
		cy.click_custom_action_button("Publish");

		cy.wait("@save_form");

		cy.get_field("route").should("have.value", "note");
		cy.get(".title-area .indicator-pill").contains("Published");
	});

	it("Open Web Form (Logged in User)", () => {
		cy.visit("/note");

		cy.fill_field("title", "Note 1");
		cy.get(".web-form-actions button").contains("Save").click();

		cy.url().should("include", "/note/Note%201");

		cy.visit("/note");
		cy.url().should("include", "/note/Note%201");
	});

	it("Open Web Form (Guest)", () => {
		cy.request("/api/method/logout");
		cy.visit("/note");

		cy.url().should("include", "/note/new");

		cy.fill_field("title", "Guest Note 1");
		cy.get(".web-form-actions button").contains("Save").click();

		cy.url().should("include", "/note/new");

		cy.visit("/note");
		cy.url().should("include", "/note/new");
	});

	it("Login Required", () => {
		cy.login();
		cy.visit("/app/web-form/note");

		cy.findByRole("tab", { name: "Form Settings" }).click();
		cy.get('input[data-fieldname="login_required"]').check({ force: true });

		cy.save();

		cy.visit("/note");
		cy.url().should("include", "/note/Note%201");

		cy.call("logout");

		cy.visit("/note");
		cy.get_open_dialog()
			.get(".modal-message")
			.contains("You are not permitted to access this page without login.");
	});

	it("Show List", () => {
		cy.login();
		cy.visit("/app/web-form/note");

		cy.findByRole("tab", { name: "List Settings" }).click();
		cy.get('input[data-fieldname="show_list"]').check();

		cy.save();

		cy.visit("/note");
		cy.url().should("include", "/note/list");
		cy.get(".web-list-table").should("be.visible");
	});

	it("Show Custom List Title", () => {
		cy.visit("/app/web-form/note");

		cy.findByRole("tab", { name: "List Settings" }).click();
		cy.fill_field("list_title", "Note List");

		cy.save();

		cy.visit("/note");
		cy.url().should("include", "/note/list");
		cy.get(".web-list-header h1").should("contain.text", "Note List");
	});

	it("Show Custom List Columns", () => {
		cy.visit("/note");
		cy.url().should("include", "/note/list");

		cy.get(".web-list-table thead th").contains("Name");
		cy.get(".web-list-table thead th").contains("Title");

		cy.visit("/app/web-form/note");

		cy.findByRole("tab", { name: "List Settings" }).click();

		cy.get('[data-fieldname="list_columns"] .grid-footer button')
			.contains("Add Row")
			.as("add-row");

		cy.get("@add-row").click();
		cy.get('[data-fieldname="list_columns"] .grid-body .rows').as("grid-rows");
		cy.get("@grid-rows").find('.grid-row:first [data-fieldname="fieldname"]').click();
		cy.get("@grid-rows")
			.find('.grid-row:first select[data-fieldname="fieldname"]')
			.select("Title (Data)");

		cy.get("@add-row").click();
		cy.get("@grid-rows").find('.grid-row[data-idx="2"] [data-fieldname="fieldname"]').click();
		cy.get("@grid-rows")
			.find('.grid-row[data-idx="2"] select[data-fieldname="fieldname"]')
			.select("Public (Check)");

		cy.get("@add-row").click();
		cy.get("@grid-rows").find('.grid-row:last [data-fieldname="fieldname"]').click();
		cy.get("@grid-rows")
			.find('.grid-row:last select[data-fieldname="fieldname"]')
			.select("Content (Text Editor)");

		cy.save();

		cy.visit("/note");
		cy.url().should("include", "/note/list");
		cy.get(".web-list-table thead th").contains("Title");
		cy.get(".web-list-table thead th").contains("Public");
		cy.get(".web-list-table thead th").contains("Content");
	});

	it("Breadcrumbs", () => {
		cy.visit("/note/Note 1");
		cy.get(".breadcrumb-container .breadcrumb .breadcrumb-item:first a")
			.should("contain.text", "Note")
			.click();
		cy.url().should("include", "/note/list");
	});

	it("Custom Breadcrumbs", () => {
		cy.visit("/app/web-form/note");

		cy.findByRole("tab", { name: "Form Settings" }).click();
		cy.get(".form-section .section-head").contains("Customization").click();
		cy.fill_field("breadcrumbs", '[{"label": _("Notes"), "route":"note"}]', "Code");
		cy.get(".form-section .section-head").contains("Customization").click();
		cy.save();

		cy.visit("/note/Note 1");
		cy.get(".breadcrumb-container .breadcrumb .breadcrumb-item:first a").should(
			"contain.text",
			"Notes"
		);
	});

	it("Read Only", () => {
		cy.login();
		cy.visit("/note");
		cy.url().should("include", "/note/list");

		// Read Only Field
		cy.get('.web-list-table tbody tr[id="Note 1"]').click();
		cy.get('.frappe-control[data-fieldname="title"] .control-input').should(
			"have.css",
			"display",
			"none"
		);
	});

	it("Edit Mode", () => {
		cy.visit("/app/web-form/note");

		cy.findByRole("tab", { name: "Form Settings" }).click();
		cy.get('input[data-fieldname="allow_edit"]').check();

		cy.save();

		cy.visit("/note/Note 1");
		cy.url().should("include", "/note/Note%201");

		cy.get(".web-form-actions a").contains("Edit").click();
		cy.url().should("include", "/note/Note%201/edit");

		// Editable Field
		cy.get_field("title").should("have.value", "Note 1");

		cy.fill_field("title", " Edited");
		cy.get(".web-form-actions button").contains("Save").click();
		cy.get_field("title").should("have.value", "Note 1 Edited");
	});

	it("Allow Multiple Response", () => {
		cy.visit("/app/web-form/note");

		cy.findByRole("tab", { name: "Form Settings" }).click();
		cy.get('input[data-fieldname="allow_multiple"]').check();

		cy.save();

		cy.visit("/note");
		cy.url().should("include", "/note/list");

		cy.get(".web-list-actions a:visible").contains("New").click();
		cy.url().should("include", "/note/new");

		cy.fill_field("title", "Note 2");
		cy.get(".web-form-actions button").contains("Save").click();
	});

	it("Allow Delete", () => {
		cy.visit("/app/web-form/note");

		cy.findByRole("tab", { name: "Form Settings" }).click();
		cy.get('input[data-fieldname="allow_delete"]').check();

		cy.save();

		cy.visit("/note");
		cy.url().should("include", "/note/list");

		cy.get('.web-list-table tbody tr[id="Note 1"] .list-col-checkbox').click();
		cy.get('.web-list-table tbody tr[id="Note 2"] .list-col-checkbox').click();
		cy.get(".web-list-actions button:visible").contains("Delete").click({ force: true });

		cy.get(".web-list-actions button").contains("Delete").should("not.be.visible");

		cy.visit("/note");
		cy.get('.web-list-table tbody tr[id="Note 1"]').should("not.exist");
		cy.get('.web-list-table tbody tr[id="Note 2"]').should("not.exist");
		cy.get('.web-list-table tbody tr[id="Guest Note 1"]').should("exist");
	});

	it("Navigate and Submit a WebForm", () => {
		cy.visit("/update-profile");

		cy.get(".web-form-actions a").contains("Edit").click();

		cy.fill_field("last_name", "_Test User");

		cy.get(".web-form-actions .btn-primary").click();
		cy.url().should("include", "/me");
	});

	it("Navigate and Submit a MultiStep WebForm", () => {
		cy.call("frappe.tests.ui_test_helpers.update_webform_to_multistep").then(() => {
			cy.visit("/update-profile-duplicate");

			cy.get(".web-form-actions a").contains("Edit").click();

			cy.fill_field("last_name", "_Test User");

			cy.get(".btn-next").should("be.visible");
			cy.get(".btn-next").click();

			cy.get(".btn-previous").should("be.visible");
			cy.get(".btn-next").should("not.be.visible");

			cy.get(".web-form-actions .btn-primary").click();
			cy.url().should("include", "/me");
		});
	});
});
