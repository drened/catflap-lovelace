class CatFlapDashboardCard extends HTMLElement {
  static getStubConfig() {
    return {
      type: "custom:catflap-dashboard-card",
      title: "Cat Flap",
      prefix: "esp32_cat_flap",
      cats: "Minka,Milo",
    };
  }

  static getConfigElement() {
    return document.createElement("catflap-dashboard-card-editor");
  }

  setConfig(config) {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = {
      title: "Cat Flap",
      prefix: "esp32_cat_flap",
      cats: "",
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

  _entity(entityId) {
    if (!entityId || !this._hass) return null;
    return this._hass.states[entityId] || null;
  }

  _state(entityId) {
    const stateObj = this._entity(entityId);
    if (!stateObj) return "not found";
    return stateObj.state;
  }

  _name(entityId, fallback) {
    const stateObj = this._entity(entityId);
    if (!stateObj) return fallback || entityId;
    return stateObj.attributes.friendly_name || fallback || entityId;
  }

  _slugify(input) {
    return String(input || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  _catList() {
    return String(this._config.cats || "")
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
  }

  _buildRows() {
    const prefix = this._config.prefix;
    const rows = [];
    const overview = [
      { label: "Last Direction", id: `sensor.${prefix}_last_direction` },
      { label: "Last Chip", id: `sensor.${prefix}_last_chip` },
      { label: "Last Known Cat", id: `sensor.${prefix}_last_cat` },
      { label: "Last Event", id: `sensor.${prefix}_last_event` },
      { label: "Registered Cats", id: `sensor.${prefix}_registered_cats` },
      { label: "Total Events", id: `sensor.${prefix}_total_events` },
      { label: "Dropped Duplicates", id: `sensor.${prefix}_dropped_duplicates` },
      { label: "Unknown Chip Events", id: `sensor.${prefix}_unknown_chip_events` },
      { label: "Unknown Direction Events", id: `sensor.${prefix}_unknown_direction_events` },
    ];

    overview.forEach((item) => {
      rows.push(`
        <div class="row">
          <div class="label">${item.label}</div>
          <div class="value">${this._state(item.id)}</div>
        </div>
      `);
    });

    const cats = this._catList();
    if (cats.length) {
      rows.push(`<div class="section">Cats</div>`);
      cats.forEach((catName) => {
        const slug = this._slugify(catName);
        const insideId = `binary_sensor.${prefix}_${slug}_inside`;
        const outsideId = `sensor.${prefix}_${slug}_outside_today`;
        const insideRaw = this._state(insideId);
        const insideLabel = insideRaw === "on" ? "Inside" : insideRaw === "off" ? "Outside" : insideRaw;
        rows.push(`
          <div class="row">
            <div class="label">${catName}</div>
            <div class="value">${insideLabel}</div>
          </div>
          <div class="row sub">
            <div class="label">Outside Today</div>
            <div class="value">${this._state(outsideId)} h</div>
          </div>
        `);
      });
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

    const prefix = this._config.prefix;
    const activityId = `binary_sensor.${prefix}_activity`;
    const activityRaw = this._state(activityId);
    const activity = activityRaw === "on" ? "Active" : activityRaw === "off" ? "Idle" : activityRaw;
    const title = this._config.title || "Cat Flap";

    this.content.innerHTML = `
      <div class="title">
        <ha-icon icon="mdi:cat"></ha-icon>
        <span>${title}</span>
        <span class="badge">Activity: ${activity}</span>
      </div>
      ${this._buildRows()}
    `;
  }
}

class CatFlapDashboardCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = {
      title: "Cat Flap",
      prefix: "esp32_cat_flap",
      cats: "",
      ...config,
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.schema = [
        { name: "title", selector: { text: {} } },
        { name: "prefix", selector: { text: {} } },
        {
          name: "cats",
          selector: {
            text: {
              multiline: true,
            },
          },
        },
      ];
      this._form.computeLabel = (schema) => {
        const labels = {
          title: "Card title",
          prefix: "Entity prefix (without domain)",
          cats: "Cat names (comma separated)",
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

    this._form.hass = this._hass;
    this._form.data = {
      title: this._config.title || "",
      prefix: this._config.prefix || "",
      cats: this._config.cats || "",
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
