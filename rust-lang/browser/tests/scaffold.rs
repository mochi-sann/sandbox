//! Smoke test confirming the crate and its module layout compile and link.
//!
//! These assertions are deliberately trivial; their real purpose is to make the
//! `browser` library a build dependency of the test target so that any future
//! breakage in the module structure is caught by `cargo test`.

#[test]
fn modules_are_reachable() {
    // Touch every public module path so the test binary depends on the whole
    // crate. The `use` statements would fail to compile if a module were
    // renamed or removed.
    #[allow(unused_imports)]
    use browser::{css, dom, html, layout, painting, style};
}

#[test]
fn crate_links() {
    // A no-op that simply forces the `browser` rlib to be linked.
    assert_eq!(2 + 2, 4);
}
