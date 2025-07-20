### 🔧 Environment Setup

Create a `.env` file in the root directory of your **backend project** and add the following:

DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
JWT_SECRET=your_jwt_secret


📌 **Instructions**:

- Replace the values after `=` with your actual **database credentials**.
- `JWT_SECRET` can be **any random secure string**. It's used to sign and verify JWT tokens.

> ⚠️ **Do not commit your `.env` file** to GitHub.  
> Instead, create a `.env.example` file (without real values) for others to reference.
