# FediJS

A pure JavaScript client using Bootstrap for connecting to a Fediverse server like Mastodon or Pleroma/Akkoma and fetching posts.

Not much is currently implemented except for the most basic functionality ... Planning to add more features but if you extend the functionality, do let me know 🙂

## How to run

You need to run the code off a web server, but if you are running locally, you can quickly spin up a web server using either PHP or Python as follows ...

1. **PHP** - Switch to the folder with the FediJS code and run the following command:

   ```
   php -S localhost:8000
   ```

   Now, access `localhost:8000` in your browser.

2. **Python** - Switch to the folder with the FediJS code and run the following command:

   ```bash
   python3 -m http.server --cgi 8080
   ```

   Now open the URL `localhost:8080` in your browser.

   **Note:** For the above, you can change the port to any value you want, it doesn't have to be just `8000` (for PHP) or `8080` (for Python). Those are just examples ...