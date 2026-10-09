const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

const lightColors = {
  softday_background: '#F1F3EF',
  softday_surface: '#FAFBF8',
  softday_surface_muted: '#E7EBE6',
  softday_accent_soft: '#DCE4DD',
  softday_accent_dark: '#53675B',
  softday_text: '#262B27',
  softday_text_muted: '#737B75',
  softday_accent: '#85988B',
  softday_warm: '#CBD5CC',
  softday_line: '#D9DED9',
  softday_bar: '#F0F1F3EF',
  softday_danger: '#835F5B',
  softday_danger_soft: '#EEE5E3',
  softday_warm_surface: '#E3E8E3',
  softday_warm_text: '#627068',
  softday_conflict_surface: '#E1E6E1',
  softday_conflict_text: '#5F6B63',
};

const darkColors = {
  softday_background: '#171A18',
  softday_surface: '#282D29',
  softday_surface_muted: '#202421',
  softday_accent_soft: '#303A33',
  softday_accent_dark: '#B4C4B8',
  softday_text: '#EFF2EE',
  softday_text_muted: '#A4ABA5',
  softday_accent: '#A2B5A7',
  softday_warm: '#3A463D',
  softday_line: '#3A413C',
  softday_bar: '#F0171A18',
  softday_danger: '#D2A6A0',
  softday_danger_soft: '#382C2A',
  softday_warm_surface: '#29302B',
  softday_warm_text: '#ABB9AF',
  softday_conflict_surface: '#29312C',
  softday_conflict_text: '#AAB7AE',
};

function createColorsXml(colors) {
  const entries = Object.entries(colors)
    .map(([name, value]) => `  <color name="${name}">${value}</color>`)
    .join('\n');
  return `<resources>\n${entries}\n</resources>\n`;
}

module.exports = function withSoftdayAndroidColors(config) {
  return withDangerousMod(config, ['android', async (modConfig) => {
    const resourcesRoot = path.join(modConfig.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
    const targets = [
      ['values', lightColors],
      ['values-night', darkColors],
    ];

    await Promise.all(targets.map(async ([qualifier, colors]) => {
      const directory = path.join(resourcesRoot, qualifier);
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(path.join(directory, 'softday_colors.xml'), createColorsXml(colors), 'utf8');
    }));

    return modConfig;
  }]);
};
