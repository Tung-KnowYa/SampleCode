/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,jsx}",
    ],
    theme: {
      extend: {},
    },
    plugins: [
      require('@tailwindcss/typography'), // <ReactMarkdown> will be styled beautifully
    ],
  }