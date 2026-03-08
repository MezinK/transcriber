from infra.ids import generate_uuid


def test_generate_uuid_returns_uuid_instance():
    value = generate_uuid()

    assert value.version in {4, 7}
