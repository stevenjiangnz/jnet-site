# Changelog

## [Unreleased]

### Fixed
- Fixed event filtering by Result in the Events page
  - Made result filtering case-insensitive (accepts 'success', 'SUCCESS', etc.)
  - Fixed enum conversion issue where backend expected uppercase but database stores lowercase
  - Updated frontend to handle case-insensitive result display
  - API now properly filters events by result status

## Previous Releases
...