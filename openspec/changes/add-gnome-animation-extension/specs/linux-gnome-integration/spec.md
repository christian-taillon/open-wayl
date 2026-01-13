## ADDED Requirements

### Requirement: GNOME Top Bar Animation Mode
The system SHALL provide a Linux-only setting that routes recording and processing animations to a GNOME Top Bar extension instead of the overlay window.

#### Scenario: Enable GNOME mode
- **WHEN** the user enables GNOME Top Bar mode
- **THEN** the overlay animation window is not created
- **AND** the recording and processing states are sent to the GNOME extension

#### Scenario: Disable GNOME mode
- **WHEN** the user disables GNOME Top Bar mode
- **THEN** the overlay animation window is used for recording and processing

### Requirement: DBus State Emission
The system SHALL emit recording and processing state changes over a GNOME-native DBus interface when GNOME Top Bar mode is enabled.

#### Scenario: Recording state update
- **WHEN** recording starts or stops
- **THEN** the DBus interface publishes the updated recording state

#### Scenario: Processing state update
- **WHEN** audio processing starts or finishes
- **THEN** the DBus interface publishes the updated processing state

### Requirement: Extension Availability Fallback
The system SHALL fall back to the overlay animation window when the GNOME extension is unavailable or not running.

#### Scenario: Extension missing
- **WHEN** GNOME Top Bar mode is enabled and the extension is not detected
- **THEN** the overlay animation window is used
- **AND** the user is informed that the extension is unavailable

### Requirement: GNOME Extension Packaging
The system SHALL ship the GNOME extension under `extensions/gnome/` and expose an install action from Settings.

#### Scenario: Install extension action
- **WHEN** the user clicks the install button in Settings
- **THEN** the GNOME extension installation flow is invoked

### Requirement: Linux-Only Visibility
The system SHALL expose the GNOME Top Bar mode setting only on Linux.

#### Scenario: Non-Linux platform
- **WHEN** the user is on macOS or Windows
- **THEN** the GNOME Top Bar mode setting is not shown
