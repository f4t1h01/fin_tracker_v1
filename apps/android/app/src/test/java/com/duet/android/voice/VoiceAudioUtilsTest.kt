package com.duet.android.voice

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class VoiceAudioUtilsTest {
    @Test
    fun createsValidWavHeaderForPcmPayload() {
        val header = createWavHeader(pcmByteCount = 3200)

        assertEquals("RIFF", header.asAscii(0, 4))
        assertEquals("WAVE", header.asAscii(8, 4))
        assertEquals("fmt ", header.asAscii(12, 4))
        assertEquals("data", header.asAscii(36, 4))
        assertEquals(3236, header.intLeAt(4))
        assertEquals(16, header.intLeAt(16))
        assertEquals(1, header.shortLeAt(20))
        assertEquals(VOICE_CHANNEL_COUNT, header.shortLeAt(22))
        assertEquals(VOICE_SAMPLE_RATE_HZ, header.intLeAt(24))
        assertEquals(3200, header.intLeAt(40))
    }

    @Test
    fun pcmVoiceLevelsReactToSpeechSamples() {
        val silence = ShortArray(2400) { 0 }
        val speech = ShortArray(2400) { index ->
            if (index % 2 == 0) 12000 else -12000
        }

        val silentLevels = buildPcmVoiceLevels(silence, silence.size)
        val speechLevels = buildPcmVoiceLevels(speech, speech.size)

        assertTrue(silentLevels.all { it == 0f })
        assertTrue(speechLevels.maxOrNull() ?: 0f > 0.5f)
    }

    @Test
    fun resolvesVoiceUploadMetadataForWavAndM4a() {
        assertEquals(
            VoiceUploadMetadata(VOICE_WAV_FILENAME, VOICE_WAV_MIME_TYPE),
            voiceUploadMetadata("duet-voice.wav", "audio/wav")
        )
        assertEquals(
            VoiceUploadMetadata(VOICE_M4A_FILENAME, VOICE_M4A_MIME_TYPE),
            voiceUploadMetadata("duet-voice.m4a", "audio/mp4")
        )
    }

    private fun ByteArray.asAscii(offset: Int, length: Int): String {
        return copyOfRange(offset, offset + length).toString(Charsets.US_ASCII)
    }

    private fun ByteArray.shortLeAt(offset: Int): Int {
        return (this[offset].toInt() and 0xff) or
            ((this[offset + 1].toInt() and 0xff) shl 8)
    }

    private fun ByteArray.intLeAt(offset: Int): Int {
        return (this[offset].toInt() and 0xff) or
            ((this[offset + 1].toInt() and 0xff) shl 8) or
            ((this[offset + 2].toInt() and 0xff) shl 16) or
            ((this[offset + 3].toInt() and 0xff) shl 24)
    }
}
