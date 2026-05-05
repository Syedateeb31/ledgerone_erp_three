### Project Overview

- LedgerOne ERP: A ERP Management system designed for Distributors, Retailers, Wholesalers, Manufacturers, and SMEs. Its core modules are Accounting, Inventory, HRM, Production, and Reporting.

## Tech Stack

- Core PHP
- MySQL
- HTML/CSS/Javascript

## Code Style

- Use camelCase for variables and function names.
- Use PascalCase for component names.
- Use kebab-case for file names.

### Project Structure

- `client/`: Contains all frontend related files.
 - `assets/`: Contains all assets of the webpage like CSS, JS, and Uploaded files.
     - `css/`: Contains all CSS files.
     - `js/`: Contains all JS.
     - `uploads/`: Contains all images.
 - `pages`: Contains all HTML frontend pages.
- `database/`: Contains all database related files.
 - `migrations/`: Contains all database migrations.
- `documentation`: Contains all documentation files.
- `errors`: Contains all error files.
- `includes`: Contains all include files which are used in mostly every page like connection.php, dashboard.php, and permissions.php.
- `server/`: Contains all backend related files.
 - `api`: Contains all API related files.