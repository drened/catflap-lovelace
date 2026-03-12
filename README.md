# Cat Flap Lovelace

HACS-installable custom Lovelace card for the `ESP32 Cat Flap` integration.

## Features

- Custom card: `custom:catflap-dashboard-card`
- Visual card editor in Home Assistant UI
- Configurable:
  - card title
  - entity prefix
  - cat names list
- Optional YAML dashboard example included

## Install via HACS

1. HACS -> Frontend -> Custom repositories.
2. Add repository: `https://github.com/drened/catflap-lovelace`
3. Category: `Dashboard`
4. Install `Cat Flap Dashboard Card`.
5. Reload browser (hard refresh) and reopen dashboard editor.

If the card still does not appear, verify resource path:

- `/hacsfiles/catflap-lovelace/catflap-dashboard-card.js`
- type: `module`

## Use the Card

1. Open dashboard editor.
2. Add card -> search for `Cat Flap Dashboard Card`.
3. Configure in UI:
   - `Card title`
   - `Cat flap entity prefix` (dropdown, default `Auto detect`)

The card now auto-discovers cats from your integration entities.

Entity naming expected from the integration:

- `binary_sensor.<prefix>_activity`
- `sensor.<prefix>_last_direction`
- `sensor.<prefix>_last_chip`
- `sensor.<prefix>_last_cat`
- `sensor.<prefix>_last_event`
- `sensor.<prefix>_registered_cats`
- `sensor.<prefix>_total_events`
- `sensor.<prefix>_dropped_duplicates`
- `sensor.<prefix>_unknown_chip_events`
- `sensor.<prefix>_unknown_direction_events`
- per cat (auto-discovered):
  - `binary_sensor.<prefix>_*_inside`
  - `sensor.<prefix>_*_outside_today`

## Manual YAML Example

- `dashboards/catflap_dashboard_example.yaml`
