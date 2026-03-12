class CatFlapDashboardCard extends HTMLElement {
  static getStubConfig() {
    return {
      type: "custom:catflap-dashboard-card",
      title: "Cat Flap",
      prefix: "",
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
      const catSlug = entityId
        .slice(expectedStart.length, entityId.length - suffix.length)
        .trim();
      if (!catSlug) return;

      const catName =
        stateObj.attributes.cat_name ||
        stateObj.attributes.friendly_name ||
        catSlug;
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

  _buildRows(prefix) {
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

    const cats = this._discoverCats(prefix);
    if (cats.length) {
      rows.push(`<div class="section">Cats</div>`);
      cats.forEach((cat) => {
        const insideRaw = this._state(cat.insideId);
        const insideLabel =
          insideRaw === "on"
            ? "Inside"
            : insideRaw === "off"
              ? "Outside"
              : insideRaw;
        rows.push(`
          <div class="row">
            <div class="label">${cat.name}</div>
            <div class="value">${insideLabel}</div>
          </div>
          <div class="row sub">
            <div class="label">Outside Today</div>
            <div class="value">${this._state(cat.outsideId)} h</div>
          </div>
        `);
      });
    } else {
      rows.push(`
        <div class="row">
          <div class="label">Cats</div>
          <div class="value">not found</div>
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
          <div class="label">Status</div>
          <div class="value">No cat flap entities found</div>
        </div>
      `;
      return;
    }

    const activityId = `binary_sensor.${prefix}_activity`;
    const activityRaw = this._state(activityId);
    const activity =
      activityRaw === "on" ? "Active" : activityRaw === "off" ? "Idle" : activityRaw;
    const title = this._config.title || "Cat Flap";

    this.content.innerHTML = `
      <div class="title">
        <ha-icon icon="mdi:cat"></ha-icon>
        <span>${title}</span>
        <span class="badge">Activity: ${activity}</span>
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
      ...config,
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _prefixOptions() {
    const discovered = CatFlapDashboardCard.discoverPrefixes(this._hass);
    const options = [{ value: "", label: "Auto detect" }];
    discovered.forEach((prefix) => {
      options.push({ value: prefix, label: prefix });
    });
    return options;
  }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (schema) => {
        const labels = {
          title: "Card title",
          prefix: "Cat flap entity prefix",
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
    ];
    this._form.hass = this._hass;
    this._form.data = {
      title: this._config.title || "",
      prefix: this._config.prefix || "",
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
