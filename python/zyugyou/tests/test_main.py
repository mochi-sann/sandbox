
import pytest
from main import dm_sending_decision


def test_dm_sending():
    assert dm_sending_decision(19) == 'DMを送付しない'
    assert dm_sending_decision(20) == 'ビール系居酒屋'
