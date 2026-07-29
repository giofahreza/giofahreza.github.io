# giofahreza.github.io

Welcome to the repository for [giofahreza.com](https://giofahreza.com), the personal website of Giofahreza. This website showcases my projects, and professional profile.

![Website Screenshot](https://giofahreza.com/assets/img/ss_index072024.png)


## Table of Contents
- [About](#about)
- [Features](#features)
- [Technologies](#technologies)
- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## About
This website serves as my digital portfolio, blog, and browser-based developer toolbox. It is built with a focus on simplicity, responsiveness, and performance.

## Features
- **Responsive Design**: Optimized for viewing on all devices.
- **Projects Showcase**: Detailed descriptions of my projects and contributions.
- **Developer Tools**: Browser-only tools under `/tools/`.
- **Jekyll Blog**: Markdown posts under `_posts/`, published under `/blog/`.
- **CMS Admin**: Optional Sveltia CMS editor under `/admin/`.

## Technologies
- **HTML5**
- **CSS3**
- **JavaScript**
- **Jekyll**: For blog layouts, posts, and clean routes.
- **Markdown**: For writing blog posts and documentation.

## Installation
To run this project locally, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/giofahreza/giofahreza.github.io.git
2. Navigate to the project directory:
   ```bash
   cd giofahreza.github.io
3. Install dependencies:
   ```bash
   bundle install
   ```
4. Run website:
   ```bash
   bundle exec jekyll serve
   ```
5. Open:
   ```text
   http://localhost:4000
   ```

If Ruby/Jekyll is not installed and you only need to test static pages locally, use:

```bash
python3 scripts/serve-local.py
```

This local server checks ports `8100`, `8101`, and `8102`, then uses the first available port. It also mimics GitHub Pages clean URLs, so `/resume` resolves to `/resume.html` and `/tools` resolves to `/tools/index.html`.

## Usage
- Updating pages: edit the relevant HTML file.
- Updating tools: edit `tools/index.html`, `assets/tools.css`, and `assets/tools.js`.
- Writing blog posts: add Markdown files to `_posts/`.
- Browser editing: open `/admin/` and authenticate with a GitHub token that can write to this repository.
- Customization: customize the theme by editing the CSS.

## Contributing
I welcome contributions to improve this website. To contribute, follow these steps:
1. Fork the repository.
2. Create a new branch (git checkout -b feature-branch).
3. Make your changes and commit them (git commit -m 'Add new feature').
4. Push to the branch (git push origin feature-branch).
5. Open a pull request.

## License
This project is licensed under the MIT License. See the LICENSE file for details.

## Contact
Feel free to reach out to me on [LinkedIn](https://linkedin.com/in/giofahreza).

Thank you for visiting my repository. If you find this project useful or interesting, please consider giving it a star ⭐️!
