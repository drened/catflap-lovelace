class CatFlapDashboardCard extends HTMLElement {
  static OVERVIEW_FIELDS = [
    { key: "last_direction", suffix: "_last_direction" },
    { key: "last_chip", suffix: "_last_chip" },
    { key: "last_cat", suffix: "_last_cat" },
    { key: "last_event", suffix: "_last_event" },
    { key: "registered_cats", suffix: "_registered_cats" },
    { key: "total_events", suffix: "_total_events" },
    { key: "dropped_duplicates", suffix: "_dropped_duplicates" },
    { key: "unknown_chip_events", suffix: "_unknown_chip_events" },
    { key: "unknown_direction_events", suffix: "_unknown_direction_events" },
  ];

  static getStubConfig() {
    return {
      type: "custom:catflap-dashboard-card",
      title: "Cat Flap",
      prefix: "",
      selected_fields: CatFlapDashboardCard.OVERVIEW_FIELDS.map((x) => x.key),
      selected_cats: [],
    };
  }

  static getConfigElement() {
    return document.createElement("catflap-dashboard-card-editor");
  }

  static discoverPrefixes(hass) {
    if (!hass || !hass.states) return [];
    const found = new Set();
    Object.keys(hass.states).forEach((entityId) => {
      const match = entityId.match(/^sensor\.(.+)_registered_cats$/);
      if (match && match[1]) {
        found.add(match[1]);
      }
    });
    return Array.from(found).sort((a, b) => a.localeCompare(b));
  }

  setConfig(config) {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = {
      title: "Cat Flap",
      prefix: "",
      selected_fields: CatFlapDashboardCard.OVERVIEW_FIELDS.map((x) => x.key),
      selected_cats: [],
      ...config,
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 8;
  }

  _language() {
    const lang = this._hass?.language || this._hass?.locale?.language || "en";
    return String(lang).toLowerCase().startsWith("de") ? "de" : "en";
  }

  _t(key) {
    const dict = {
      en: {
        last_direction: "Last Direction",
        last_chip: "Last Chip",
        last_cat: "Last Known Cat",
        last_event: "Last Event",
        registered_cats: "Registered Cats",
        total_events: "Total Events",
        dropped_duplicates: "Dropped Duplicates",
        unknown_chip_events: "Unknown Chip Events",
        unknown_direction_events: "Unknown Direction Events",
        cats: "Cats",
        inside: "Inside",
        outside: "Outside",
        outside_today: "Outside Today",
        activity: "Activity",
        active: "Active",
        idle: "Idle",
        status: "Status",
        no_entities_found: "No cat flap entities found",
        not_found: "not found",
        card_title: "Card title",
        prefix_label: "Cat flap entity prefix",
        fields_label: "Visible overview fields",
        cats_label: "Visible cats (empty = all)",
        auto_detect: "Auto detect",
      },
      de: {
        last_direction: "Letzte Richtung",
        last_chip: "Letzter Chip",
        last_cat: "Letzte bekannte Katze",
        last_event: "Letztes Ereignis",
        registered_cats: "Registrierte Katzen",
        total_events: "Gesamt-Ereignisse",
        dropped_duplicates: "Verworfene Duplikate",
        unknown_chip_events: "Unbekannte Chip-Ereignisse",
        unknown_direction_events: "Unbekannte Richtungs-Ereignisse",
        cats: "Katzen",
        inside: "Drinnen",
        outside: "Draußen",
        outside_today: "Heute draußen",
        activity: "Aktivität",
        active: "Aktiv",
        idle: "Inaktiv",
        status: "Status",
        no_entities_found: "Keine Katzenklappen-Entitäten gefunden",
        not_found: "nicht gefunden",
        card_title: "Kartentitel",
        prefix_label: "Katzenklappen-Entitätspräfix",
        fields_label: "Sichtbare Übersichtsfelder",
        cats_label: "Sichtbare Katzen (leer = alle)",
        auto_detect: "Automatisch erkennen",
      },
    };
    const lang = this._language();
    return dict[lang][key] || key;
  }

  _entity(entityId) {
    if (!entityId || !this._hass) return null;
    return this._hass.states[entityId] || null;
  }

  _state(entityId) {
    const stateObj = this._entity(entityId);
    if (!stateObj) return this._t("not_found");
    return stateObj.state;
  }

  _normalizeArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value.trim()) {
      return value.split(",").map((x) => x.trim()).filter((x) => x.length > 0);
    }
    return [];
  }

  _effectivePrefix() {
    if (this._config.prefix && this._config.prefix.trim()) {
      return this._config.prefix.trim();
    }
    const discovered = CatFlapDashboardCard.discoverPrefixes(this._hass);
    return discovered.length ? discovered[0] : "";
  }

  _discoverCats(prefix) {
    if (!prefix || !this._hass || !this._hass.states) return [];
    const cats = [];
    const suffix = "_inside";
    const expectedStart = `binary_sensor.${prefix}_`;
    Object.entries(this._hass.states).forEach(([entityId, stateObj]) => {
      if (!entityId.startsWith(expectedStart) || !entityId.endsWith(suffix)) {
        return;
      }
      const catSlug = entityId.slice(expectedStart.length, entityId.length - suffix.length).trim();
      if (!catSlug) return;

      const catName = stateObj.attributes.cat_name || stateObj.attributes.friendly_name || catSlug;
      const outsideId = `sensor.${prefix}_${catSlug}_outside_today`;
      cats.push({
        slug: catSlug,
        name: catName,
        insideId: entityId,
        outsideId,
      });
    });
    cats.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return cats;
  }

  _formatValue(fieldKey, rawValue) {
    if (rawValue === this._t("not_found")) return rawValue;
    if (fieldKey !== "last_event") return rawValue;
    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) return rawValue;
    const locale = this._language() === "de" ? "de-DE" : undefined;
    return parsed.toLocaleString(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  _selectedFields() {
    const selected = this._normalizeArray(this._config.selected_fields);
    if (!selected.length) {
      return CatFlapDashboardCard.OVERVIEW_FIELDS.map((x) => x.key);
    }
    return selected;
  }

  _selectedCats(cats) {
    const selected = this._normalizeArray(this._config.selected_cats);
    if (!selected.length) return cats;
    const set = new Set(selected);
    return cats.filter((cat) => set.has(cat.slug));
  }

  _buildRows(prefix) {
    const rows = [];
    const selectedFields = new Set(this._selectedFields());
    CatFlapDashboardCard.OVERVIEW_FIELDS
      .filter((field) => selectedFields.has(field.key))
      .forEach((field) => {
        const id = `sensor.${prefix}${field.suffix}`;
        const raw = this._state(id);
        const value = this._formatValue(field.key, raw);
        rows.push(`
        <div class="row">
          <div class="label">${this._t(field.key)}</div>
          <div class="value">${value}</div>
        </div>
      `);
      });

    const cats = this._selectedCats(this._discoverCats(prefix));
    if (cats.length) {
      rows.push(`<div class="section">${this._t("cats")}</div>`);
      cats.forEach((cat) => {
        const insideRaw = this._state(cat.insideId);
        const insideLabel = insideRaw === "on" ? this._t("inside") : insideRaw === "off" ? this._t("outside") : insideRaw;
        rows.push(`
          <div class="row">
            <div class="label">${cat.name}</div>
            <div class="value">${insideLabel}</div>
          </div>
          <div class="row sub">
            <div class="label">${this._t("outside_today")}</div>
            <div class="value">${this._state(cat.outsideId)} h</div>
          </div>
        `);
      });
    } else {
      rows.push(`
        <div class="row">
          <div class="label">${this._t("cats")}</div>
          <div class="value">${this._t("not_found")}</div>
        </div>
      `);
    }

    return rows.join("");
  }

  _render() {
    if (!this._config || !this._hass) return;

    if (!this.content) {
      const card = document.createElement("ha-card");
      this.content = document.createElement("div");
      this.content.className = "content";
      const style = document.createElement("style");
      style.textContent = `
        .content { padding: 16px; }
        .title { font-size: 1.2rem; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .title ha-icon { color: var(--primary-color); }
        .badge { margin-left: auto; font-size: 0.85rem; color: var(--secondary-text-color); }
        .section { margin-top: 14px; margin-bottom: 6px; font-size: 0.9rem; color: var(--secondary-text-color); text-transform: uppercase; letter-spacing: 0.04em; }
        .row { display: grid; grid-template-columns: 1fr auto; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--divider-color); }
        .row.sub { padding-top: 2px; color: var(--secondary-text-color); }
        .row:last-child { border-bottom: none; }
        .label { font-weight: 500; }
        .value { text-align: right; font-variant-numeric: tabular-nums; }
      `;
      card.appendChild(style);
      card.appendChild(this.content);
      this.appendChild(card);
    }

    const prefix = this._effectivePrefix();
    if (!prefix) {
      this.content.innerHTML = `
        <div class="title">
          <ha-icon icon="mdi:cat"></ha-icon>
          <span>${this._config.title || "Cat Flap"}</span>
        </div>
        <div class="row">
          <div class="label">${this._t("status")}</div>
          <div class="value">${this._t("no_entities_found")}</div>
        </div>
      `;
      return;
    }

    const activityId = `binary_sensor.${prefix}_activity`;
    const activityRaw = this._state(activityId);
    const activity = activityRaw === "on" ? this._t("active") : activityRaw === "off" ? this._t("idle") : activityRaw;
    const title = this._config.title || "Cat Flap";

    this.content.innerHTML = `
      <div class="title">
        <ha-icon icon="mdi:cat"></ha-icon>
        <span>${title}</span>
        <span class="badge">${this._t("activity")}: ${activity}</span>
      </div>
      ${this._buildRows(prefix)}
    `;
  }
}

class CatFlapDashboardCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = {
      title: "Cat Flap",
      prefix: "",
      selected_fields: CatFlapDashboardCard.OVERVIEW_FIELDS.map((x) => x.key),
      selected_cats: [],
      ...config,
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _language() {
    const lang = this._hass?.language || this._hass?.locale?.language || "en";
    return String(lang).toLowerCase().startsWith("de") ? "de" : "en";
  }

  _t(key) {
    const dict = {
      en: {
        card_title: "Card title",
        prefix_label: "Cat flap entity prefix",
        fields_label: "Visible overview fields",
        cats_label: "Visible cats (empty = all)",
        auto_detect: "Auto detect",
      },
      de: {
        card_title: "Kartentitel",
        prefix_label: "Katzenklappen-Entitätspräfix",
        fields_label: "Sichtbare Übersichtsfelder",
        cats_label: "Sichtbare Katzen (leer = alle)",
        auto_detect: "Automatisch erkennen",
      },
    };
    return dict[this._language()][key] || key;
  }

  _prefixOptions() {
    const discovered = CatFlapDashboardCard.discoverPrefixes(this._hass);
    const options = [{ value: "", label: this._t("auto_detect") }];
    discovered.forEach((prefix) => {
      options.push({ value: prefix, label: prefix });
    });
    return options;
  }

  _currentPrefix() {
    if (this._config.prefix && this._config.prefix.trim()) {
      return this._config.prefix.trim();
    }
    const discovered = CatFlapDashboardCard.discoverPrefixes(this._hass);
    return discovered.length ? discovered[0] : "";
  }

  _fieldOptions() {
    const temp = new CatFlapDashboardCard();
    temp._hass = this._hass;
    return CatFlapDashboardCard.OVERVIEW_FIELDS.map((field) => ({
      value: field.key,
      label: temp._t(field.key),
    }));
  }

  _catOptions() {
    const prefix = this._currentPrefix();
    if (!prefix) return [];
    const temp = new CatFlapDashboardCard();
    temp._hass = this._hass;
    return temp._discoverCats(prefix).map((cat) => ({
      value: cat.slug,
      label: cat.name,
    }));
  }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (schema) => {
        const labels = {
          title: this._t("card_title"),
          prefix: this._t("prefix_label"),
          selected_fields: this._t("fields_label"),
          selected_cats: this._t("cats_label"),
        };
        return labels[schema.name] || schema.name;
      };
      this._form.addEventListener("value-changed", (ev) => {
        const newConfig = {
          ...this._config,
          ...ev.detail.value,
        };
        this._config = newConfig;
        this.dispatchEvent(
          new CustomEvent("config-changed", {
            detail: { config: newConfig },
            bubbles: true,
            composed: true,
          }),
        );
      });
      this.appendChild(this._form);
    }

    this._form.schema = [
      { name: "title", selector: { text: {} } },
      {
        name: "prefix",
        selector: {
          select: {
            mode: "dropdown",
            options: this._prefixOptions(),
          },
        },
      },
      {
        name: "selected_fields",
        selector: {
          select: {
            mode: "dropdown",
            multiple: true,
            options: this._fieldOptions(),
          },
        },
      },
      {
        name: "selected_cats",
        selector: {
          select: {
            mode: "dropdown",
            multiple: true,
            options: this._catOptions(),
          },
        },
      },
    ];
    this._form.hass = this._hass;
    this._form.data = {
      title: this._config.title || "",
      prefix: this._config.prefix || "",
      selected_fields: this._config.selected_fields || [],
      selected_cats: this._config.selected_cats || [],
    };
  }
}

customElements.define("catflap-dashboard-card", CatFlapDashboardCard);
customElements.define("catflap-dashboard-card-editor", CatFlapDashboardCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "catflap-dashboard-card",
  name: "Cat Flap Dashboard Card",
  description: "Dashboard card for ESP32 Cat Flap integration",
  preview: true,
  documentationURL: "https://github.com/drened/catflap-lovelace",
});
