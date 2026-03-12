# Cat Flap Lovelace Dashboard

Standalone Lovelace dashboard package for the `ESP32 Cat Flap` Home Assistant integration.

## Purpose

This repository is intentionally separate from the integration repository so users can:

- download dashboard YAML only
- keep custom dashboard changes independent from integration updates

## Includes

- `dashboards/catflap_dashboard_example.yaml`

## Requirements

- Home Assistant with the `ESP32 Cat Flap` custom integration installed
- Existing entities from the integration (replace entity IDs in YAML)

## Install (Manual)

1. Copy `dashboards/catflap_dashboard_example.yaml`.
2. In Home Assistant open a dashboard and choose:
   - `Edit dashboard`
   - `Add card`
   - `Manual`
3. Paste YAML.
4. Replace entity IDs with your real IDs from Developer Tools -> States.

## Notes

- This package is not a standalone HACS content type.
- HACS can install the integration, but dashboard YAML is usually pasted/imported manually.
