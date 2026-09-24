# Deep Modules

From _A Philosophy of Software Design_:

- **Deep module** (aim for this) = small interface + lots of hidden implementation. Few methods, simple params, complex logic tucked inside.
- **Shallow module** (avoid) = large interface + thin implementation that just passes through.

When designing an interface, ask:

- Can I reduce the number of methods?
- Can I simplify the parameters?
- Can I hide more complexity inside?
