import { Link } from "react-router-dom";
import "./components.css";

export function NavBar() {
    return (
        <header className="navbar" role="banner">
            <div className="container navbar__inner">
                <Link
                    to="/"
                    className="navbar__brand"
                    aria-label="Picasso — home"
                >
                    <span className="navbar__brand-mark" aria-hidden="true">
                        P
                    </span>
                    <span className="navbar__brand-name">Picasso</span>
                </Link>
                <p className="navbar__tag">Style transfer demo</p>
            </div>
            <hr className="rule" />
        </header>
    );
}

export default NavBar;
