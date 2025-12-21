# Bloggy

A modern, full-featured blog platform built with Node.js, Express, EJS and PostgreSQL. Bloggy provides a complete content management system with role-based access control, rich text editing, and admin moderation.

## Features

### User Authentication
- **Local Authentication**: Email/password registration and login with bcrypt encryption
- **OAuth Integration**: Google Sign-In support
- **Session Management**: Persistent user sessions with Express Session
- **Profile Management**: Users can update their name and bio

### Blog Management
- **Rich Text Editor**: Quill.js-powered editor with formatting options
- **Content Moderation**: Admin approval workflow for new posts
- **CRUD Operations**: Create, read, update, and delete blogs
- **Categories**: Organize posts by topic (Programming, Web Development, Career, etc.)
- **Search & Filter**: Search by keyword, filter by category, and sort alphabetically
- **Pagination**: Browse posts with paginated results

### Admin Panel
- **Dashboard**: Overview of total users, blogs, and pending approvals
- **User Management**: View and delete user accounts
- **Blog Moderation**: Approve or reject pending blog posts
- **Content Control**: Delete any blog post

### UI/UX
- **Dark Mode**: Toggle between light and dark themes
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Animations**: Smooth transitions and fade effects
- **Alerts**: SweetAlert2 integration for user-friendly notifications

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: Passport.js (Local & Google OAuth2)
- **View Engine**: EJS
- **Styling**: Tailwind CSS
- **Rich Text Editor**: Quill.js
- **Password Hashing**: bcrypt
- **Alerts**: SweetAlert2

## Installation

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- Google OAuth credentials (optional, for Google Sign-In)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd BlogProject
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a .env file in the root directory:
   ```env
   DB_USER=your_postgres_user
   DB_HOST=localhost
   DB_DATABASE=blogWebsite
   DB_PASSWORD=your_postgres_password
   DB_PORT=5432
   SESSION_SECRET=your_session_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

4. **Set up the database**
   
   Create the PostgreSQL database and tables:
   ```sql
   CREATE DATABASE blogWebsite;

   CREATE TABLE users (
     id SERIAL PRIMARY KEY,
     email VARCHAR(255) UNIQUE NOT NULL,
     password VARCHAR(255) NOT NULL,
     firstname VARCHAR(100) NOT NULL,
     lastname VARCHAR(100) NOT NULL,
     about TEXT DEFAULT '',
     type VARCHAR(50) DEFAULT 'user'
   );

   CREATE TABLE blogs (
     id SERIAL PRIMARY KEY,
     blogname VARCHAR(255) NOT NULL,
     blogcontent TEXT NOT NULL,
     category VARCHAR(100) DEFAULT 'Other',
     blogauthor_id INTEGER REFERENCES users(id),
     status VARCHAR(50) DEFAULT 'pending',
     published_at TIMESTAMP DEFAULT NOW()
   );
   ```

5. **Start the server**
   ```bash
   node index.js
   ```

   The app will run at `http://localhost:3000`

## User Workflow

### For Regular Users

1. **Registration/Login**
   - Register with email and password (requires strong password)
   - Or sign in with Google
   - Accept terms and conditions

2. **Creating a Blog**
   - Navigate to "Create Blog" from the header
   - Enter a title and select a category
   - Write content using the rich text editor (minimum 150 characters)
   - Submit for admin approval
   - Blog status will be "pending" until approved

3. **Managing Your Blogs**
   - Access your profile to view all your blogs
   - Edit or delete your own posts
   - Track approval status (pending/approved)

4. **Profile Management**
   - Update your first name, last name, and bio (max 500 characters)
   - Delete your account (all your blogs will be preserved but unlinked)

### For Admins

1. **Access Admin Panel**
   - Log in with admin credentials
   - Automatically redirected to `/admin`

2. **Dashboard Overview**
   - View total users, blogs, and pending approvals
   - Quick stats at a glance

3. **Moderate Blogs**
   - Review pending blog submissions
   - Approve blogs to make them public
   - Reject inappropriate content
   - Delete any published blog

4. **User Management**
   - View all registered users
   - Delete user accounts when necessary

## File Structure

```
BlogProject/
├── index.js              # Main server file
├── package.json          # Dependencies and scripts
├── .env                  # Environment variables
├── public/
│   ├── images/          # Static images
│   └── styles/
│       └── quill.css    # Quill editor custom styles
└── views/
    ├── home.ejs         # Homepage with blog listing
    ├── login.ejs        # Login page
    ├── register.ejs     # Registration page
    ├── createBlog.ejs   # Blog creation form
    ├── editBlog.ejs     # Blog editing form
    ├── blog.ejs         # Individual blog view
    ├── userProfile.ejs  # User profile page
    ├── adminPanel.ejs   # Admin dashboard
    └── partials/
        ├── header.ejs   # Header with navigation
        ├── footer.ejs   # Footer
        ├── carousel.ejs # Homepage carousel
        ├── searchBar.ejs # Search and filter bar
        ├── profileCard.ejs # User profile card
        └── userBlogs.ejs # User's blog list
```

## Key Routes

- `GET /` - Homepage with blog listings
- `GET /login` - Login page
- `GET /register` - Registration page
- `GET /create` - Create blog page (authenticated)
- `POST /create` - Submit new blog
- `GET /blog/:id` - View individual blog
- `GET /editblog/:id` - Edit blog page (author only)
- `GET /profile/:id` - User profile (authenticated)
- `GET /admin` - Admin panel (admin only)
- `POST /approveblog/:id` - Approve blog (admin only)
- `POST /rejectblog/:id` - Reject blog (admin only)

## Security Features

- Password hashing with bcrypt (10 salt rounds)
- Session-based authentication
- CSRF protection through session secrets
- Input validation and sanitization
- Role-based access control (user/admin)
- SQL injection prevention with parameterized queries

**Author**: Lahiru Hettiarachchi
