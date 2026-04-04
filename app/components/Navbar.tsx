import {Link} from "react-router";

const Navbar = () => {
    return (
        <nav className="navbar gap-2 md:gap-4 overflow-x-auto">
            <Link to="/" className="shrink-0 flex-1">
                <p className="text-xl md:text-2xl font-bold text-gradient whitespace-nowrap">RezuMatch.Ai</p>
            </Link>
            <Link to="/upload" className="primary-button w-fit shrink-0 !px-4 !py-2 md:!px-6 md:!py-2.5 text-sm md:text-base whitespace-nowrap">
                Upload Resume
            </Link>
        </nav>
    )
}
export default Navbar
