module.exports = {
  presets: [
    ['taro', {
      framework: 'react',
      ts: true
    }]
  ],
  plugins: [
    '@babel/plugin-transform-typescript',
    ['@babel/plugin-proposal-class-properties', { loose: true }]
  ]
}